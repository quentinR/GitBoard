function errorFound({res, errorMessage}) {
  res.statusCode = 400;
  res.send({success: false, message: errorMessage});
}

module.exports = {
  errorFound
}