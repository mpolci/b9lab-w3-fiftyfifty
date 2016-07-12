contract FailTransfer {
  bool shouldFail = true;
  function () {
    if (shouldFail) throw;
  }

  function setFail(bool b) {
    shouldFail = b;
  }

}
