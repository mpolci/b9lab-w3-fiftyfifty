contract FailTransfer {
  function () {
    throw;
  }
}