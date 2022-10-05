var db = require('../config/connections');
var collection = require('../config/collections');
const objectId = require('mongodb').ObjectId;
var dateTime = require('node-datetime');
var dt = dateTime.create();
var formatted = dt.format('Y-m-d');

module.exports = {
  addCoupen: (coupenData) => {
    coupenData.user=user=[]
    coupenData.startingDate = formatted;
    let discount = parseInt(coupenData.discount);
    coupenData.discount = discount;
    return new Promise(async (resolve, reject) => {
      let response = {};
      let coupen = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .findOne({ coupenName: coupenData.coupenName });
      if (coupen) {
        console.log('same COUPEN');
        response.status = true;
        resolve(response);
      } else {
        db.get()
          .collection(collection.COUPEN_COLLECTION)
          .insertOne(coupenData)
          .then((data) => {
            resolve(data.insertedId);
            console.log(' no same cupen');
          });
      }
    });
  },
  findCoupen: () => {
    return new Promise(async (resolve, reject) => {
      let coupen = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .find()
        .toArray();
      resolve(coupen);
    });
  },
  coupenApllay: (coupenCode, userId) => {
    return new Promise(async (resolve, reject) => {
      let coupen = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .findOne({
          coupenName: coupenCode,
        });
      if (coupen) {
        let user = coupen.user.includes(userId);
        let date = new Date();
        let expairyDate = new Date(coupen.expairyDate);
        if (date > expairyDate) {
          resolve({ coupenExp: true });
        } else {
          console.log('coupen', coupen);
          console.log('userrrrrrrrrrrrrrrrr', user);
          if (user) {
            resolve({ coupenUsed: true });
          } else {
            coupen.coupen = true;
            resolve(coupen);
          }
        }
      } else {
        resolve({ invalidCoupen: true });
      }
    });
  },
  activatecategoryOffer: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: objectId(categoryId) }, { $set: { status: true } });
      resolve({ status: true });
    });
  },
  categoryofferActive: (categoryId, categoryName) => {
    return new Promise(async (resolve, reject) => {
      offer = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .findOne(
          { _id: objectId(categoryId) },
          {
            status: true,
          }
        );
      if (offer.status) {
        console.log(offer);
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTIONS)
          .find({ categoryName: categoryName })
          .toArray();

        products.map(async (prod) => {
          discount = (prod.MRP * offer.discount) / 100;

          OfferPrice = prod.MRP - discount;
          await db
            .get()
            .collection(collection.PRODUCT_COLLECTIONS)
            .updateMany(
              { _id: objectId(prod._id) },
              {
                $set: {
                  OfferPrice: OfferPrice,
                  discount: offer.discount,
                },
              }
            );
          resolve();
        });
      } else {
        console.log('not find');
        resolve();
      }
    });
  },

  deactivatecategoryOffer: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: objectId(categoryId) }, { $set: { status: false } });
      resolve({ status: true });
    });
  },
  categoryofferDeactive: (categoryId, categoryName) => {
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    return new Promise(async (resolve, reject) => {
      offer = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .findOne(
          { _id: objectId(categoryId) },
          {
            status: true,
          }
        );
      if (!offer.status) {
        console.log(offer);
        let products = await db
          .get()
          .collection(collection.PRODUCT_COLLECTIONS)
          .find({ categoryName: categoryName })
          .toArray();

        products.map(async (prod) => {
          discount = (prod.MRP * offer.discount) / 100;

          OfferPrice = prod.OfferPrice + discount;

          discount2 = (OfferPrice * 5) / 100;
          OfferPrice2 = OfferPrice - discount2;

          await db
            .get()
            .collection(collection.PRODUCT_COLLECTIONS)
            .updateMany(
              { _id: objectId(prod._id) },
              {
                $set: {
                  OfferPrice: OfferPrice2,
                  discount: 5,
                },
              }
            );
          resolve();
        });
      } else {
        console.log('not find');
        resolve();
      }
    });
  },
  changeCategoryOfferPercentage: (categoryId, percentage) => {
    console.log(categoryId, percentage);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne(
          {
            _id: objectId(categoryId),
          },
          {
            $set: { discount: percentage },
          }
        );
      resolve();
    });
  },
};
