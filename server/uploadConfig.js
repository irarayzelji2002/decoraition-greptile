const multer = require("multer");
const path = require("path");

// Multer storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(__dirname, "../public/uploads"));
//   },
//   filename: function (req, file, cb) {
//     const originalName = file.originalname.replace(/ /g, "-");
//     const uniqueFilename = Date.now() + "-" + generateRandomString(8) + "-" + originalName;
//     cb(null, uniqueFilename);
//   },
// });
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

function generateRandomString(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

module.exports = { upload, generateRandomString };
