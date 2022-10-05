var express = require('express');
// const session = require('express-session');
var router = express.Router();
const adminHelpers = require('../helpers/admin-helpers');
const productHelpers = require('../helpers/product-herlpers');
const userHelpers = require('../helpers/user-helpers');
const bannerHelpers = require('../helpers/banner-helpers');
const multer = require('multer');
const categoryHelpers = require('../helpers/category-helpers');
const offerHelpers = require('../helpers/offer-helpers');
const { response } = require('express');
// const { response } = require('express');

const isAuth = (req, res, next) => {
  try {
    if (req.session.adminLogin) {
      next();
    } else {
      res.render('admin/admin-login');
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
};

/* GET home page. */

router.get('/', isAuth, function (req, res) {
  try {
    if (req.session.adminLogin) {
      res.redirect('/admin/dashBoard');
    } else {
      res.render('admin/admin-login', { adminerror: req.session.adminerror });
      req.session.adminerror = null;
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* admin login. --------------------------------------------------*/

router.post('/submit', (req, res) => {
  try {
    adminHelpers.doLogin(req.body).then((response) => {
      if (response.admin) {
        req.session.adminLogin = true;
        req.session.admin = response.admin;
        res.redirect('/admin/dashBoard');
      } else {
        req.session.adminerror = true;
        res.redirect('/admin/');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/dashBoard', isAuth, async function (req, res) {
  try {
    let admin = req.session.admin;
    let totalUSers = await adminHelpers.totalUSers();
    let totalProducts = await adminHelpers.totalProducts();
    let monthlyEarning = await adminHelpers.monthlyEarning();
    let yearlyEarning = await adminHelpers.yearlyEarning();
    let cod = await adminHelpers.getPaymentMethodNums('COD');
    let razorpay = await adminHelpers.getPaymentMethodNums('Razorpay');
    let paypal = await adminHelpers.getPaymentMethodNums('Paypal');
    let Wallet = await adminHelpers.getPaymentMethodNums('Wallet');
    let chart= await adminHelpers.getChartData()
    console.log('chart',chart);
    res.render('admin/dashboard', {
      admin,
      cod,
      razorpay,
      paypal,
      Wallet,
      chart,
      totalUSers,
      totalProducts,
      monthlyEarning,
      yearlyEarning,
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* dailySales. --------------------------------------------------*/

router.get('/dailySales', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let day = await adminHelpers.getDailySalesReport();
    console.log('dailyReport',day);
    res.render('admin/dailySales', { day, admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* monthlySales. --------------------------------------------------*/

router.get('/monthlySales', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let monthly = await adminHelpers.monthlySalesReport();
    console.log('monthly', monthly);
    res.render('admin/monthlySales', { monthly, admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* monthlySales. --------------------------------------------------*/

router.get('/yearlySales', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let yearly = await adminHelpers.getYearlySalesReport();
    console.log('monthly', yearly);
    res.render('admin/yearlySales', { yearly, admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* products view. --------------------------------------------------*/

router.get('/view-products', isAuth, function (req, res) {
  let admin = req.session.admin;
  try {
    productHelpers.getAllProducts().then((products) => {
      res.render('admin/view-products', { products, admin });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* Addproduct. --------------------------------------------------*/

//multer midileWare................
const fileStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/product-images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '--' + file.originalname);
  },
});

const upload = multer({ storage: fileStorageEngine });
//multer midileWare................

router.get('/add-product', isAuth, async function (req, res) {
  try {
    let categories = await categoryHelpers.getAllCategories();
    let subCategories = await categoryHelpers.getAllSubCategories();
    let brand = await categoryHelpers.getAllBrands();
    let admin = req.session.admin;
    res.render('admin/add-product', {
      admin,
      categories,
      subCategories,
      brand,
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post(
  '/add-product',
  isAuth,
  upload.array('Images'),
  function (req, res) {
    var filenames = req.files.map(function (file) {
      return file.filename;
    });
    req.body.Images = filenames;
    productHelpers.addProduct(req.body, () => {
      res.redirect('/admin/view-products');
    });
  }
);

/* Delet Product. --------------------------------------------------*/

router.get('/delete-product/:id', isAuth, (req, res) => {
  let proId = req.params.id;
  try {
    productHelpers.deleteProduct(proId).then((response) => {
      res.redirect('/admin/view-products');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* Edit Product. --------------------------------------------------*/

router.get('/edit-product/:id', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let categories = await categoryHelpers.getAllCategories();
    let subCategories = await categoryHelpers.getAllSubCategories();
    let brand = await categoryHelpers.getAllBrands();
    let product = await productHelpers.getProductDetails(req.params.id);
    res.render('admin/edit-products', {
      product,
      categories,
      subCategories,
      brand,
      admin,
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});
router.post('/edit-product/:id', isAuth, upload.array('Images'), (req, res) => {
  try {
    var filenames = req.files.map(function (file) {
      return file.filename;
    });
    req.body.Images = filenames;
    let proId = req.params.id;
    productHelpers.updateProduct(proId, req.body).then(() => {
      res.redirect('/admin/view-products');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * add stock
 */
let itemId;
router.get('/Add-stock/:id', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    itemId = req.params.id;
    res.render('admin/add-stock', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});
router.post('/Add-stock', isAuth, (req, res) => {
  console.log(req.body);
  try {
    productHelpers.addItemStock(itemId, req.body.Stock);

    res.redirect('/admin/view-products');
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  Product categories. --------------------------------------------------*/

router.get('/product-categories', isAuth, (req, res) => {
  try {
    categoryHelpers.getAllCategories().then(async(categories) => {
      console.log('categories',categories);
      let admin = req.session.admin;
      res.render('admin/product-categories', { admin, categories, });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  add categories. --------------------------------------------------*/
router.get('/add-category', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    res.render('admin/add-newcategories', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});
/*  delete categories. --------------------------------------------------*/
router.post('/delete-category', isAuth, (req, res) => {
  try {
    console.log(req.body);
    productHelpers.deleteCategory(req.body.categoryName).then((response) => {
      if (response.find) {
        response.find = true;
        res.json(response);
      } else {
        res.json(response);
      }
    });
  } catch (error) {
    console.log('err.message', error);
    res.send('Oops');
  }
});

/*  add New categories. --------------------------------------------------*/
router.post('/add-newcategory', isAuth, (req, res) => {
  try {
    categoryHelpers.addCategory(req.body).then(() => {
      res.redirect('/admin/product-categories');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  add subCategories. --------------------------------------------------*/

router.get('/view-subCategories', isAuth, (req, res) => {
  try {
    categoryHelpers.getAllSubCategories().then((subCategories) => {
      let admin = req.session.admin;
      console.log('subCategories',subCategories);
      res.render('admin/view-subCategories', { admin, subCategories });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  add categories. --------------------------------------------------*/

let categoryId //for adding subcategory

router.get('/add-subCategory', isAuth, (req, res) => {
  try {
    // categoryId=req.params.id
    // console.log('req.params.id',req.params.id);
    // let admin = req.session.admin;
    res.render('admin/add-subCategory', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/add-subcategory', isAuth, (req, res) => {
  try {
    categoryHelpers.addSubCategory(req.body).then(() => {
      res.redirect('/admin/product-categories');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  Brands. --------------------------------------------------*/

router.get('/brand', isAuth, (req, res) => {
  try {
    categoryHelpers.getAllBrands().then((brand) => {
      let admin = req.session.admin;
      res.render('admin/view-brands', { admin, brand });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/add-brand', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    res.render('admin/add-brands', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/add-brands', isAuth, (req, res) => {
  try {
    categoryHelpers.addBrand(req.body).then(() => {
      res.redirect('/admin/brand');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*  delete categories. --------------------------------------------------*/

router.get('/delete-brand/:id', isAuth, (req, res) => {
  let proId = req.params.id;
  try {
    categoryHelpers.deleteBrand(proId).then((response) => {
      res.redirect('/admin/brand');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/Coupen-code', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let coupen = await offerHelpers.findCoupen();
    res.render('admin/Coupen', { coupen, admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

let coupenExist; //variable for checking coupen exist in database
router.get('/add-coupen', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    res.render('admin/add-coupen', { coupenExist: coupenExist, admin });
    coupenExist = false;
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/add-coupen', isAuth, (req, res) => {
  try {
    req.body.user = user = [];
    offerHelpers.addCoupen(req.body).then((response) => {
      if (response.status) {
        coupenExist = true;
        res.redirect('/admin/add-coupen');
      } else {
        res.redirect('/admin/Coupen-code');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * categoryOffer
 */

router.get('/category-offer', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let categories = await categoryHelpers.getAllCategories();
    res.render('admin/view-categoryOffers', { admin, categories });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/categoryOffer-Activate/:id', (req, res) => {
  try {
    console.log(req.body.categoryName);
    offerHelpers.activatecategoryOffer(req.params.id).then((response) => {
      offerHelpers.categoryofferActive(req.params.id, req.body.categoryName);
      console.log(response);
      res.json(response);
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/categoryOffer-Deactivate/:id', (req, res) => {
  try {
    offerHelpers.deactivatecategoryOffer(req.params.id).then((response) => {
      offerHelpers.categoryofferDeactive(req.params.id, req.body.categoryName);
      console.log(response);
      res.json(response);
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* for chaging category offer %. --------------------------------------------------*/

let CategoryId;
router.get('/change-CategoryOfferpercentage/:id', isAuth, (req, res) => {
  try {
    CategoryId = req.params.id;
    let admin = req.session.admin;
    res.render('admin/change-CategoryOfferpercentage', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/change-CategoryOfferpercentage', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    offerHelpers
      .changeCategoryOfferPercentage(CategoryId, req.body.pecentage)
      .then(() => {
        res.redirect('/admin/category-offer');
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* user blocking. --------------------------------------------------*/

router.get('/add-categoryOffer', isAuth, async (req, res) => {
  try {
    let admin = req.session.admin;
    let categories = await categoryHelpers.getAllCategories();
    res.render('admin/category-offer', { admin, categories });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* view user. --------------------------------------------------*/

router.get('/view-users', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    userHelpers.getAllUsers().then((userDet) => {
      res.render('admin/view-users', { userDet, admin });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* user blocking. --------------------------------------------------*/
router.get('/block/:id', isAuth, (req, res) => {
  try {
    let usrId = req.params.id;
    adminHelpers.blockedUser(usrId).then(() => {
      req.session.user = null;
      req.session.loggedIn = false;
      res.redirect('/admin/view-users');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/* user unbloking. --------------------------------------------------*/

router.get('/unblock/:id', isAuth, (req, res) => {
  try {
    let usrId = req.params.id;
    adminHelpers.unblokUser(usrId).then(() => {
      res.redirect('/admin/view-users');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*view-Banner. --------------------------------------------------*/
//muter midileware..............
const fileStorageEngine2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/banner-Images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '--' + file.originalname);
  },
});
//multer midileware..............

router.get('/banner', isAuth, (req, res) => {
  try {
    bannerHelpers.getbanner().then((banner) => {
      let admin = req.session.admin;
      res.render('admin/view-banner', { banner, admin });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});
const Banerupload = multer({ storage: fileStorageEngine2 });

/*add-Banner. --------------------------------------------------*/

router.get('/add-banner', isAuth, (req, res) => {
  try {
    let admin = req.session.admin;
    res.render('admin/add-banner', { admin });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/add-banner', isAuth, Banerupload.array('Images'), (req, res) => {
  var filenames = req.files.map(function (file) {
    return file.filename;
  });
  req.body.Images = filenames;
  bannerHelpers.addBanner(req.body, () => {
    let admin = req.session.admin;
    res.render('admin/add-banner', { admin });
  });
});

/*change-Banner. --------------------------------------------------*/

router.get('/change-banner/:id', isAuth, async (req, res) => {
  let banner = await bannerHelpers.getBannerDetails(req.params.id);
  let admin = req.session.admin;
  res.render('admin/change-banner', { banner, admin });
});

router.post(
  '/change-banner/:id',
  isAuth,
  Banerupload.array('Images'),
  (req, res) => {
    var filenames = req.files.map(function (file) {
      return file.filename;
    });
    req.body.Images = filenames;
    bannerHelpers.ChangeBanner(req.params.id, req.body).then(() => {
      res.redirect('/admin/banner');
    });
  }
);

router.get('/orders', isAuth, async (req, res) => {
  let orders = await adminHelpers.getUserOrders();
  orders.reverse();
  res.render('admin/userOrders', { admin: req.session.admin, orders });
});

let prodectId;

router.get('/view-order-products/:id', isAuth, async (req, res) => {
  prodectId = req.params.id;
  let poroducts = await adminHelpers.getOrderProducts(req.params.id);
  let orders = await userHelpers.getUserOrdersView(req.params.id);
  let orderTrack = await userHelpers.orderTrack(req.params.id);
  res.render('admin/view-order-products', {
    admin: req.session.admin,
    poroducts,
    orders,
    orderTrack,
  });
});


router.get('/cancel-order/:id', isAuth, (req, res) => {
  try {
    adminHelpers.cancelOrder(req.params.id).then(() => {
      res.redirect('/admin/orders');
    });
  } catch (err) {
    console.log('err.message', err);
    res.send('Oops');
  }
});

router.get('/Order-status/:id', isAuth, (req, res) => {
  try {
    res.redirect('admin/orders');
  } catch (error) {
    console.log('err.message', error);
    res.send('Oops');
  }
});

router.post('/status-change/:id', (req, res) => {
  adminHelpers.changeOrderStatus(req.params.id, req.body.stastus);
  res.json('success')
});

/* section logout. --------------------------------------------------*/

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('admin/admin-login');
});

module.exports = router;
