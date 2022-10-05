var db = require('../config/connections');
var collections = require('../config/collections');
const objectId = require('mongodb').ObjectId;

module.exports = {
  addBanner: (banner, cb) => {
    console.log(banner);
    db.get()
      .collection(collections.BANNER_COLLECTION)
      .insertOne(banner)
      .then((data) => {
        console.log(data);
        cb(data.insertedId);
      });
  },
  getbanner: () => {
    return new Promise((resolve, reject) => {
      let banner = db
        .get()
        .collection(collections.BANNER_COLLECTION)
        .find()
        .toArray();
      resolve(banner);
    });
  },
  getBannerDetails: (bannerId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BANNER_COLLECTION)
        .findOne({ _id: objectId(bannerId) })
        .then((banner) => {
          resolve(banner);
        });
    });
  },
  ChangeBanner: (bannerId, bannerDetails) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.BANNER_COLLECTION)
        .updateOne(
          { _id: objectId(bannerId) },
          {
            $set: {
              NAME: bannerDetails.NAME,
              DISCRIPTION: bannerDetails.DISCRIPTION,
              caption: bannerDetails.caption,
              Images: bannerDetails.Images,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
};
