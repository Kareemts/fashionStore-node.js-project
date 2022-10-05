var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-herlpers');
const userHelpers = require('../helpers/user-helpers');
const bannerHelpers = require('../helpers/banner-helpers');
// const { response } = require('express');
const paypal = require('paypal-rest-sdk');
const offerHelpers = require('../helpers/offer-helpers');
// const { response } = require('express');
// const { walletBalance } = require('../helpers/user-helpers');
// const objectId = require('mongodb').ObjectId;
require('dotenv').config();

// verFyligin...............
const verFyligin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};
let cartCount;
const verFyCartCout = async (req, res, next) => {
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
    next();
  } else {
    next();
  }
};

const verFyWishlist = async (req, res, next) => {
  if (req.session.loggedIn) {
    let wishlistCount = await userHelpers.getWishlist(req.session.user._id);
    req.session.wishlistCount = wishlistCount;
    next();
  } else {
    next();
  }
};

// verFyligin...............

// Twilio...................
const client = require('twilio')(
  process.env.ACCOUNT_SID,
  process.env.AUTH_SID,
  {
    lazyLoading: true,
  }
);
// Twilio....................

let loginUser = false;
router.get('/', verFyWishlist, function (req, res) {
  let user = req.session.user;
  let wishlistCount = req.session.wishlistCount;
  productHelpers.getAllProducts().then(async (products) => {
    banner = await bannerHelpers.getbanner();
    categories = await productHelpers.getCategory();
    console.log('categories', categories);
    products = await productHelpers.getProducts();
    // getMen = await productHelpers.getMen();
    if (req.session.user) {
      let wishlistdata = await userHelpers.getWishlistProducts(
        req.session.user._id
      );
      products = await productHelpers.getProducts();
      // getMen = await productHelpers.getMen();
      for (var i = 0; i < wishlistdata.length; i++) {
        for (var e = 0; e < products.length; e++) {
          if (wishlistdata[i].item.toString() == products[e]._id.toString()) {
            products[e].status = true;
          }
          // if (wishlistdata[i].item.toString() == getMen[e]._id.toString()) {
          //   getMen[e].status = true;
          // }
        }
      }
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    } else {
      cartCount = null;
    }
    res.render('user/index', {
      categories,
      products,
      user,
      banner,
      products,
      cartCount,
      wishlistCount,
      loginUser: loginUser,
    });
    // loginUser=false
  });
});

/**
 * sCategories
 */

router.get('/showCategory/:category', async (req, res) => {
  let user = req.session.user;
  let products = await productHelpers.getCategoryProduct(req.params.category);
  console.log('products', products);
  res.render('user/view-category-products', {
    products,
    user,
    cartCount,
    loginUser: loginUser,
  });
});

/*
 *login.
 */

router.get('/login', async function (req, res) {
  if (req.session.loggedIn) {
    loginUser = true;
    res.redirect('/');
  } else res.render('user/loginForm', { loginErr: req.session.loginErr, loginErr2: req.session.loginErrb });
  req.session.loginErr = false;
  req.session.loginErrb = false;
});

/*
 * signup.
 */
let refferalError = false;
router.get('/signup', (riq, res) => {
  res.render('user/signupForm', { refferalError });
  refferalError = false;
});

router.post('/signup', async (req, res) => {
  try {
    if (!req.body.refferalCode == '') {
      let refferal = await userHelpers.refferal(req.body.refferalCode);
      console.log('refferal', refferal);
      if (refferal == true) {
        refferalError = true;
        res.redirect('/signup');
      } else {
        let Number = parseInt(req.body.MobileNumber);
        refferalCode = Number.toString(16);
        userHelpers.doSignup(req.body, refferalCode).then(() => {
          userHelpers.createWallet(req.body.Email);
          res.redirect('/login');
        });
      }
    } else {
      let Number = parseInt(req.body.MobileNumber);
      refferalCode = Number.toString(16);
      userHelpers.doSignup(req.body, refferalCode).then(() => {
        userHelpers.createWallet(req.body.Email);
        res.redirect('/login');
      });
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*
 * user login.
 */

let mobile;
let login;

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      if (response.user) {
        req.session.user = response.user;
        req.session.loggedIn = true;
        loginUser = true;
        res.redirect('/');
      } else {
        req.session.loginErrb = true;
        res.redirect('/login');
      }
    } else {
      req.session.loginErr = true;
      res.redirect('/login');
    }
  });
});

/*
 *otp login.
 */
router.get('/otpLogin', (req, res) => {
  try {
    if (req.session.user) {
      res.redirect('/');
    } else {
      res.render('user/otp-login', { loginErr3: req.session.loginErrc });
      req.session.loginErrc = false;
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/otpLogin', (req, res) => {
  try {
    const otp = req.body.otp;
    client.verify
      .services(process.env.SERVICE_SID)
      .verificationChecks.create({
        to: mobile,
        code: otp,
      })
      .then((resp) => {
        if (resp.valid) {
          req.session.user = login.user;
          req.session.loggedIn = true;
          loginUser = true;
          res.redirect('/');
        } else {
          req.session.loginErrc = true;
          res.redirect('/otpLogin');
        }
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * login with mobile number
 */

router.get('/mobile', (req, res) => {
  try {
    if (req.session.user) {
      res.redirect('/');
    } else {
      res.render('user/mobile-otplogin', {
        erromNumber: req.session.erromNumber,
      });
      req.session.erromNumber = false;
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

let resendOtp;
router.post('/mobile-otplogin', (req, res) => {
  try {
    userHelpers.numberLogin(req.body).then((response) => {
      resendOtp = req.body.MobileNumber;
      if (response.user) {
        login = response;
        mobile = `+91${req.body.MobileNumber}`;
        client.verify
          .services(process.env.SERVICE_SID)
          .verifications.create({
            to: `+91${req.body.MobileNumber}`,
            channel: 'sms',
          })
          .then((res) => {
            res.status(200).json({ res });
          });
        res.redirect('/otpLogin');
      } else {
        req.session.erromNumber = true;
        res.redirect('/mobile');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/resend-otp', (req, res) => {
  try {
    userHelpers.reSendOtp(resendOtp).then((response) => {
      if (response.user) {
        login = response;
        client.verify
          .services(process.env.SERVICE_SID)
          .verifications.create({
            to: mobile,
            channel: 'sms',
          })
          .then((res) => {
            res.status(200).json({ res });
          });
        res.redirect('/otpLogin');
      } else {
        res.redirect('/otpLogin');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/*
 *view products.
 */

router.get('/view-product/:id', verFyCartCout, (req, res) => {
  productHelpers.itemView(req.params.id).then((itemView) => {
    let user = req.session.user;
    res.render('user/itemview-new', { itemView, user, cartCount });
  });
});

/*
 * add to cart
 */

router.get('/add-to-cart/:id', verFyligin, (req, res) => {
  console.log(req.params.id);
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

/**
 * Cart
 */

router.get('/view-cart', verFyligin, async (req, res) => {
  try {
    coupenDis = null;
    sumOfCartProducts = await userHelpers.sumOfCartProducts(
      req.session.user._id
    );
    let poroduct = await userHelpers.getCartProducts(req.session.user._id);
    let cartCount = 0;
    if (poroduct.length > 0) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    let user = req.session.user;
    res.render('user/view-cart', {
      user,
      poroduct,
      cartCount,
      sumOfCartProducts,
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Cart Quantity increment and decrement
 */

router.post('/change-Product-quantity', verFyligin, async (req, res) => {
  try {
    userHelpers
      .changeProductQty(req.body, req.body.quantity, req.body.product)
      .then(async (response) => {
        console.log(response);
        response.total = await userHelpers.sumOfCartProducts(req.body.user);
        console.log('response', response);
        res.json(response);
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Remove item from cart
 */

router.post('/remove-item-from-cart', verFyligin, (req, res) => {
  try {
    userHelpers.removeCartProduct(req.body).then((response) => {
      res.json(response);
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * coupen
 */
// let coupenDis;
// let DiscAmount;
// let totalDiscount;
// let couponCode;
router.post('/coupen', async (req, res) => {
  try {
    req.session.couponCode = req.body.coupenCode;
    if (req.body.coupenCode == '') {
      res.json({ noCoupen: true });
    } else {
      sumOfCartProducts = await userHelpers.sumOfCartProducts(
        req.session.user._id
      );
      if (10000 < sumOfCartProducts) {
        console.log('req.body.coupenCode', req.body.coupenCode);
        coupenData = await offerHelpers.coupenApllay(
          req.body.coupenCode,
          req.session.user._id
        );
        if (coupenData.coupenExp) {
          res.json({ coupenExp: true });
        }
        if (coupenData.coupenUsed) {
          res.json({ coupenUsed: true });
        }
        if (coupenData.coupen) {
          console.log('sumOfCartProducts', sumOfCartProducts);
          req.session.DiscAmount =
            (coupenData.discount * sumOfCartProducts) / 100;
          req.session.totalDiscount =
            sumOfCartProducts - req.session.DiscAmount;
          let coupenDis = {
            DiscAmount: req.session.DiscAmount,
            totalDiscount: req.session.totalDiscount,
            total: sumOfCartProducts,
          };
          req.session.coupenDis = coupenDis;
          res.json({ coupenDis });
        }
        if (coupenData.invalidCoupen) {
          res.json({ invalidCoupen: true });
        }
      } else {
        res.json({ lessAmount: true });
      }
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * whislist
 */

router.get(
  '/Wishlist',
  verFyligin,
  verFyCartCout,
  verFyWishlist,
  async (req, res) => {
    try {
      let user = req.session.user;
      let wishlistCount = req.session.wishlistCount;
      let Wishlist = await userHelpers.getWishlistProducts(
        req.session.user._id
      );
      res.render('user/wishlist', { user, cartCount, Wishlist, wishlistCount });
    } catch (error) {
      console.log(error);
      res.send('Oops');
    }
  }
);

router.post('/add-to-wishlist/:id', async (req, res) => {
  try {
    let wishlistdata = await userHelpers.getWishlistProducts(
      req.session.user._id
    );
    let wishlist = await userHelpers.addToWishlist(
      req.params.id,
      req.session.user._id,
      wishlistdata
    );
    res.json(wishlist);
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.post('/remove-item-from-wishlist', (req, res) => {
  try {
    userHelpers.removeWishlistProduct(req.body).then((response) => {
      res.json(response);
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Order placing
 */
let insufficientFund;
router.get('/placeOrder', verFyligin, verFyCartCout, async (req, res) => {
  try {
    if (req.session.coupenDis == undefined) {
      let user = req.session.user;
      let address = await userHelpers.getAddress(req.session.user._id);
      console.log('address', address);
      let wallet = await userHelpers.walletBalance(req.session.user._id);
      wallet = parseInt(wallet.balance).toFixed(2);
      sumOfCartProducts = await userHelpers.sumOfCartProducts(
        req.session.user._id
      );
      if (cartCount == 0) {
        res.redirect('/');
      } else {
        res.render('user/place-order', {
          user,
          cartCount,
          sumOfCartProducts,
          wallet,
          address,
        });
        insufficientFund = false;
      }
    } else {
      let address = await userHelpers.getAddress(req.session.user._id);
      let wallet = await userHelpers.walletBalance(req.session.user._id);
      wallet = parseInt(wallet.balance).toFixed(2);
      sumOfCartProducts = req.session.coupenDis.totalDiscount;
      let user = req.session.user;
      if (cartCount == 0) {
        res.redirect('/');
      } else {
        res.render('user/place-order', {
          user,
          cartCount,
          sumOfCartProducts,
          wallet,
          address,
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/wallet-history', verFyligin, verFyCartCout, async (req, res) => {
  try {
    let user = req.session.user;
    let wallethistory = await userHelpers.wallethistory(req.session.user._id);
    wallethistory[0].history.reverse();
    res.render('user/wallet-history', { user, cartCount, wallethistory });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

//add new delivery address in  palce order

router.get('/add-newDeliveryAddress', verFyligin, verFyCartCout, (req, res) => {
  let user = req.session.user;
  res.render('user/add-newDeliveryAddress', { user, cartCount });
});

router.post('/add-newDeliveryAddress', (req, res) => {
  userHelpers.addNewAddress(req.body, req.session.user._id).then(() => {
    res.redirect('/placeOrder');
  });
});

let address; // Address for product delivery,from place order form

/**
 * Payment integration
 * COD
 * Razorpay
 * Paypal
 * wallet
 */
router.post('/place-order', verFyligin, async (req, res) => {
  try {
    let totalPrice;
    let product = await userHelpers.getCartProductList(req.session.user._id);
    let wallet = await userHelpers.walletBalance(req.session.user._id);
    if (req.session.coupenDis == undefined) {
      totalPrice = await userHelpers.sumOfCartProducts(req.session.user._id);
    } else {
      totalPrice = req.session.coupenDis.totalDiscount;
    }
    let deliveryAddrees = await userHelpers.getDeliveryAddress(
      req.body.address,
      req.session.user._id
    );
    address = deliveryAddrees;
    let couponCode = req.session.couponCode;
    let coupenDis = req.session.coupenDis;
    console.log('coupenDis', req.body.coupenDis);
    userHelpers
      .placeOrder(
        address,
        req.body,
        product,
        totalPrice,
        coupenDis,
        couponCode,
        req.session.user._id
      )
      .then((userId) => {
        if (req.body['payment-method'] == 'COD') {
          productHelpers.stockMangment(product);
          res.json({ COD: true });
        }
        if (req.body['payment-method'] == 'Razorpay') {
          userHelpers.generateRazorpay(userId, totalPrice).then((response) => {
            console.log('razorepayVerification', response);
            response.RAZORPAY = true;
            res.json(response);
          });
        }
        if (req.body['payment-method'] == 'Paypal') {
          userHelpers.converter(totalPrice).then((price) => {
            let totalPrice = parseFloat(price).toFixed(2);
            userHelpers.generatePaypal(userId, totalPrice).then((response) => {
              response.PAYPAL = true;
              res.json(response);
            });
          });
        }
        if (req.body['payment-method'] == 'Wallet') {
          let user = req.session.user._id;
          if (wallet.balance < totalPrice) {
            res.json({ insufficientFund: true });
          } else {
            let couponCode = req.session.couponCode;
            let coupenDis = req.session.coupenDis;
            userHelpers.wlletPayment(
              req.session.user._id,
              address,
              product,
              totalPrice,
              coupenDis,
              user,
              couponCode
            );
            productHelpers.stockMangment(product);
            res.json({ wallet: true });
          }
        }
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Payment  veryfication
 * Paypal
 */

router.get('/success', verFyligin, async (req, res) => {
  try {
    let totalPrice;
    let product = await userHelpers.getCartProductList(req.session.user._id);
    if (req.session.coupenDis == undefined) {
      totalPrice = await userHelpers.sumOfCartProducts(req.session.user._id);
    } else {
      totalPrice = req.session.coupenDis.totalDiscount;
    }
    let couponCode = req.session.couponCode;
    let coupenDis = req.session.coupenDis;
    userHelpers.varifyPaymentPaypal(
      address,
      product,
      totalPrice,
      coupenDis,
      req.session.user._id,
      couponCode
    );
    productHelpers.stockMangment(product);
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    userHelpers.converter(totalPrice).then((price) => {
      let convertedamount = parseFloat(price).toFixed(2);
      totalPrice = convertedamount;
    });
    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          amount: {
            currency: 'USD',
            total: totalPrice,
          },
        },
      ],
    };

    paypal.payment.execute(
      paymentId,
      execute_payment_json,
      function (error, payment) {
        if (error) {
          res.redirect('/order-success');
          console.log(error.response);
        } else {
          res.redirect('/order-success');
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

router.get('/cancel', (req, res) => res.render('user/payment-cancel'));

/**
 * Payment  veryfication
 * Razorpay
 */

router.post('/verfy-payment', verFyligin, async (req, res) => {
  console.log('vaeryfyPaymrnt', req.body);
  try {
    let totalPrice;
    if (req.session.coupenDis == undefined) {
      totalPrice = await userHelpers.sumOfCartProducts(req.session.user._id);
    } else {
      totalPrice = req.session.coupenDis.totalDiscount;
    }
    let product = await userHelpers.getCartProductList(req.session.user._id);
    let couponCode = req.session.couponCode;
    let coupenDis = req.session.coupenDis;
    userHelpers
      .varifyPaymentRazorepay(
        req.body,
        address,
        product,
        totalPrice,
        coupenDis,
        req.session.user._id,
        couponCode
      )
      .then(() => {
        productHelpers.stockMangment(product);
        userHelpers
          .changeOrderStatus(req.body['order[receipt]'])
          .then(() => {
            res.json({ status: true });
          })
          .catch((err) => {
            console.log(err);
            res.json({ status: false, errMs: '' });
          });
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Payment success page
 */

router.get('/order-success', verFyligin, (req, res) => {
  try {
    res.render('user/order-success', { user: req.session.user });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Orders page
 */

router.get('/orders', verFyligin, verFyCartCout, async (req, res) => {
  try {
    let orders = await userHelpers.getUserOrders(req.session.user._id);

    res.render('user/orders', { user: req.session.user, orders, cartCount });
  } catch (error) {
    console.log('err.message', error);
    res.send('Oops');
  }
});

router.get('/orders/:pageno', verFyligin, verFyCartCout, async (req, res) => {
  try {
    let orders = await userHelpers.getUserOrders(
      req.session.user._id,
      req.params.pageno
    );
    res.render('user/orders', { user: req.session.user, orders, cartCount });
  } catch (error) {
    console.log(error);
    console.log('err.message', error);
    res.send('Oops');
  }
});

let oderId; // for invoice

router.get(
  '/view-order-products/:id',
  verFyCartCout,
  verFyligin,
  async (req, res) => {
    try {
      oderId = req.params.id;
      let poroducts = await userHelpers.getOrderProducts(req.params.id);
      let orders = await userHelpers.getUserOrdersView(req.params.id);
      let orderTrack = await userHelpers.orderTrack(req.params.id);
      res.render('user/view-order-products', {
        user: req.session.user,
        poroducts,
        cartCount,
        orders,
        orderTrack,
      });
    } catch (error) {
      console.log(error);
      res.send('Oops');
    }
  }
);

/**
 * For order cancelation
 */

router.get('/cancel-order/:id', (req, res) => {
  try {
    userHelpers.cancelOrder(req.params.id).then(() => {
      userHelpers.cancelOrderAmountTrasferingToWallet(
        req.params.id,
        req.session.user._id
      );
      productHelpers.stockMangmentInc(req.params.id);
      setTimeout(cancelOrder, 500);
      function cancelOrder() {
        res.redirect('/orders');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Return item
 */

router.get('/Return-Item/:id', verFyCartCout, verFyligin, async (req, res) => {
  try {
    userHelpers.getUserOrdersView(req.params.id).then((order) => {
      userHelpers.returnItem(req.params.id, req.session.user._id, order);
      productHelpers.stockMangmentInc(req.params.id);
      res.render('user/Return-Item'),
        {
          user: req.session.user,
          cartCount,
        };
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * recipt download
 */

router.get('/download-invoice', async (req, res) => {
  try {
    let user = await userHelpers.faindUser(req.session.user._id);
    let poroducts = await userHelpers.getOrderProducts(oderId);
    let orders = await userHelpers.getUserOrdersView(oderId);
    userHelpers.downloadInvoice(poroducts, orders, user);
    res.redirect('/orders');
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * User profile view
 */

router.get('/user-profile', verFyligin, verFyCartCout, async (req, res) => {
  try {
    let wallet = await userHelpers.walletBalance(req.session.user._id);
    let walletBalance = parseInt(wallet.balance).toFixed(2);
    userHelpers.faindUser(req.session.user._id).then((userData) => {
      res.render('user/userProfile', {
        user: req.session.user,
        userData,
        cartCount,
        walletBalance,
      });
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * For changing password
 */

router.get('/changePassword', verFyligin, (req, res) => {
  try {
    res.render('user/changePassword', {
      user: req.session.user,
      pssErr: req.session.pssErr,
    });
    req.session.pssErr = false;
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Password changing  form
 */

router.post('/changePassword', verFyligin, (req, res) => {
  try {
    let user = req.session.user;
    userHelpers.chagePassword(req.body, req.session.user._id).then((status) => {
      if (status) {
        console.log('password change');
        res.redirect('/user-profile');
      } else {
        req.session.pssErr = true;
        res.redirect('/changePassword');
      }
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Personal informations changing
 */

router.get(
  '/change-personal-information',
  verFyligin,
  verFyCartCout,
  async (req, res) => {
    try {
      let userData = await userHelpers.faindUser(req.session.user._id);
      res.render('user/change-personal-information', {
        user: req.session.user,
        userData,
        cartCount,
      });
    } catch (error) {
      console.log(error);
      res.send('Oops');
    }
  }
);

/**
 * Personal information changing form
 */

router.post('/change-personal-information', verFyligin, (req, res) => {
  try {
    userHelpers
      .chagePersonalInformation(req.body, req.session.user._id)
      .then(() => {
        res.redirect('/user-profile');
      });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Delivery address
 */

router.get('/mange-address', verFyligin, verFyCartCout, async (req, res) => {
  try {
    let user = req.session.user;
    let address = await userHelpers.getAddress(req.session.user._id);
    console.log('{{this.deliveryAddrees.[0].Pincode}}', address);
    res.render('user/mange-address', { user, address, cartCount });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * For adding new delivery address
 */

router.get('/add-new-address', verFyligin, (req, res) => {
  try {
    res.render('user/add-new-address', { user: req.session.user });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * delivery address adding form
 */

router.post('/add-new-address', verFyligin, (req, res) => {
  console.log('req.body', req.body);
  try {
    userHelpers.addNewAddress(req.body, req.session.user._id).then(() => {
      res.redirect('/mange-address');
    });
  } catch (error) {
    console.log(error);
    res.send('Oops');
  }
});

/**
 * Logout router
 */

router.get('/logout', (req, res) => {
  req.session.destroy();
  coupenDis = null;
  loginUser = false;
  res.redirect('/');
});

module.exports = router;
