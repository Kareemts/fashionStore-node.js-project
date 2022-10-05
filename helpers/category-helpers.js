var db = require('../config/connections');
var collections = require('../config/collections');
const objectId = require('mongodb').ObjectId;
var Handlebars = require('handlebars');
// const { response } = require('express');

Handlebars.registerHelper('inc', function (value, options) {
  return parseInt(value) + 1;
});

module.exports = {
  addCategory: (categoryData) => {
    let discount = 10;
    discount = parseInt(discount);

    (categoryData.status = false), (categoryData.discount = discount);

    return new Promise(async (resolve, reject) => {
      let response = {};
      let category = await db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .findOne({ categoryName: categoryData });
      if (category) {
        console.log('same category');
        response.status = true;
        resolve(response);
      } else {
        db.get()
          .collection(collections.CATEGORY_COLLECTION)
          .insertOne(categoryData)
          .then((data) => {
            resolve(data.insertedId);
            console.log(' no same category');
          });
      }
    });
  },

  getAllCategories: () => {
    return new Promise((resolve, reject) => {
      let categories = db
        .get()
        .collection(collections.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(categories);
    });
  },

  addSubCategory: (subcategoryData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let Subcategory = await db
        .get()
        .collection(collections.SUBCATEGORY_COLLECTION)
        .findOne({ subcategoryName: subcategoryData });
      if (Subcategory) {
        console.log('same subcategory');
        response.status = true;
        resolve(response);
      } else {
        db.get()
          .collection(collections.SUBCATEGORY_COLLECTION)
          .insertOne(subcategoryData)
          .then((data) => {
            resolve(data.insertedId);
            console.log(' no same subcategory');
          });
      }
    });
  },
  getAllSubCategories: () => {
    return new Promise((resolve, reject) => {
      let subCategories = db
        .get()
        .collection(collections.SUBCATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(subCategories);
    });
  },
  addBrand: (brndData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let brand = await db
        .get()
        .collection(collections.BRAND_COLLECTION)
        .findOne({ brand: brndData });
      if (brand) {
        console.log('same brand');
        response.status = true;
        resolve(response);
      } else {
        // userData.action = true;
        // userData.status = true;
        db.get()
          .collection(collections.BRAND_COLLECTION)
          .insertOne(brndData)
          .then((data) => {
            resolve(data.insertedId);
            console.log(' no same subcategory');
          });
      }
    });
  },
  getAllBrands: () => {
    return new Promise((resolve, reject) => {
      let brand = db
        .get()
        .collection(collections.BRAND_COLLECTION)
        .find()
        .toArray();
      resolve(brand);
    });
  },
  deleteSubCategory: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.SUBCATEGORY_COLLECTION)
        .deleteOne({ _id: objectId(prodId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  deleteBrand: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BRAND_COLLECTION)
        .deleteOne({ _id: objectId(prodId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
};
