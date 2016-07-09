contract FailTransfer2 {
  uint i;
  function () {
    while (true) {
      i++;
    }
  }
}
