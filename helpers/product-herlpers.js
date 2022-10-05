var db = require('../config/connections');
var collections = require('../config/collections');
const objectId = require('mongodb').ObjectId;
var Handlebars = require('handlebars');
const { response } = require('express');
// const { CATEGORY_COLLECTION } = require('../config/collections');
// const { json } = require('body-parser');

Handlebars.registerHelper('inc', function (value, options) {
  return parseInt(value) + 1;
});

module.exports = {
  addProduct: (product, cb) => {
    Stock = parseInt(product.Stock);
    MRP = parseInt(product.MRP);
    OfferPrice = parseInt(product.OfferPrice);
    product.Stock = Stock;
    product.MRP = MRP;
    product.OfferPrice = OfferPrice;
    db.get()
      .collection('product')
      .insertOne(product)
      .then((data) => {
        cb(data.insertedId);
      });
  },

  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .find()
        .toArray();
      resolve(product);
    });
  },

  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .deleteOne({ _id: objectId(prodId) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .findOne({ _id: objectId(prodId) })
        .then((product) => {
          resolve(product);
        });
    });
  },
  updateProduct: (prodId, proDetails) => {
    console.log('proDetails', proDetails);
    Stock = parseInt(proDetails.Stock);
    MRP = parseInt(proDetails.MRP);
    OfferPrice = parseInt(proDetails.OfferPrice);
    proDetails.Stock = Stock;
    proDetails.MRP = MRP;
    proDetails.OfferPrice = OfferPrice;
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .updateOne(
          { _id: objectId(prodId) },
          {
            $set: {
              NAME: proDetails.NAME,
              DISCRIPTION: proDetails.DISCRIPTION,
              MRP: proDetails.MRP,
              OfferPrice: proDetails.OfferPrice,
              Images: proDetails.Images,
              categoryName: proDetails.categoryName,
              subCategoryName: proDetails.subCategoryName,
              brand: proDetails.brand,
              Stock: proDetails.Stock,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  itemView: (proId) => {
    return new Promise(async (resolve, reject) => {
      let itemView = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .find({ _id: objectId(proId) })
        .toArray();
      resolve(itemView);
    });
  },

  getWomenn: () => {
    return new Promise(async (resolve, reject) => {
      let getWomen = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .find({ categoryName: 'Womens' })
        .toArray();
      resolve(getWomen);
    });
  },
  getCategory: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(categories);
    });
  },
  getProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .find()
        .toArray();
      resolve(products);
    });
  },
  getCategoryProduct: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .find({ categoryName: categoryName })
        .toArray();
      resolve(products);
    });
  },
  deleteCategory: (categoryData) => {
    return new Promise(async (resolve, reject) => {
      let category = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .findOne({
          categoryName: categoryData,
        });
      if (category) {
        console.log('find');
        response.find = true;
        resolve(response);
      } else {
        db.get()
          .collection(collections.CATEGORY_COLLECTION)
          .deleteOne({
            categoryName: categoryData,
          })
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  stockMangment: (produtData) => {
    return new Promise((resolve, reject) => {
      for (let i = 0; i < produtData.length; i++) {
        console.log(produtData[i].quantity);
        console.log(produtData[i].item);
        db.get()
          .collection(collections.PRODUCT_COLLECTIONS)
          .updateOne(
            { _id: objectId(produtData[i].item) },
            { $inc: { Stock: -produtData[i].quantity } }
          );
      }
    });
  },
  stockMangmentInc: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .findOne({
          _id: objectId(orderId),
        });
      if (products) {
        console.log('products', products);
        let produtData = products.products;
        for (let i = 0; i < produtData.length; i++) {
          console.log(produtData[i].quantity);
          console.log(produtData[i].item);
          db.get()
            .collection(collections.PRODUCT_COLLECTIONS)
            .updateOne(
              { _id: objectId(produtData[i].item) },
              { $inc: { Stock: produtData[i].quantity } }
            );
        }
      }
    });
  },
  // changeProductQty: (poroductQty) => {
  //   stockCount={}
  //   return new Promise(async (resolve, reject) => {
  //     for (let i = 0; i < poroductQty.length; i++) {
  //       console.log(poroductQty[i].quantity, poroductQty[i].productItem.Stock);
  //       if (poroductQty[i].quantity > poroductQty[i].productItem.Stock) {
  //         console.log('out  of stock');
  //         resolve({outOfstock:true})
  //       }else{
  //         console.log('stockk');
  //         resolve()
  //       }
  //     }
  //   });
  // },
  changeProductQty: (quantity, proId) => {
    return new Promise(async (resolve, reject) => {
      product = await db
        .get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .findOne({
          _id: objectId(proId),
        });
      console.log(product.Stock, quantity + 1);
      if (quantity >= product.Stock) {
        console.log('outOfstock');
        resolve({ outOfstock: true });
      } else {
        console.log('stock');
        resolve();
      }
    });
  },
  addItemStock: (itemId, stock) => {
    stockCount = parseInt(stock);
    console.log(stockCount);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.PRODUCT_COLLECTIONS)
        .updateOne({ _id: objectId(itemId) }, { $inc: { Stock: stockCount } });
    });
  },
};
