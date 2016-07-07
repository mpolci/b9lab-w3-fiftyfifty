contract FiftyFifty {
  address A;
  address B;

  mapping (address => uint) unsent;

  function FiftyFifty(address first, address second) {
    A = first != 0 ? A : msg.sender;
    B = second;
  }

  function getOwners() returns (address[2]) {
    return [A, B];
  }

  function setOwners(address first, address second) returns (bool){
    if (first == 0 || second == 0) throw;
    if (msg.sender != A || B != 0) throw;
    A = first;
    B = second;
    return true;
  }

  function changeAddress(address newAddr) {
    address oldAddr;
    if (msg.sender == A) {
      oldAddr = A;
      A = msg.sender;
    } else if (msg.sender == B) {
      oldAddr = B;
      B = msg.sender;
    } else throw;
    uint u = unsent[oldAddr];
    delete unsent[oldAddr];
    unsent[msg.sender] = u;
  }

  function getToDistribute() returns (uint) {
    return address(this).balance - unsent[A] - unsent[B];
  }

  function getOwedTo(address to) returns (uint) {
    if (to != A && to != B) throw;
    return getToDistribute() / 2 + unsent[to];
  }

  function sendTo(address dest) private returns (bool)  {
    uint amount = unsent[dest];
    if (amount > 0) {
      unsent[dest] = 0;
      if (dest.send(amount)) {
        return true;
      } else {
        unsent[dest] = amount;
      }
    }
    return false;
  }

  function distribute() returns (bool balanceChanged) {
    uint part = getToDistribute() / 2;
    unsent[A] += part;
    unsent[B] += part;
    bool sa = sendTo(A);
    bool sb = sendTo(B);
    return sa || sb;
  }
}
