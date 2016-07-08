
contract('FiftyFifty', accounts => {
  var ff
  var args
  beforeEach(done => {
    args = { from: accounts[0] }
    FiftyFifty.new(args).catch(done).then(contract => {
      ff = contract
      ff.setOwners(accounts[0], accounts[1], args)
        .then(() => done()).catch(done)
    })
  })
  describe('setOwners', () => {
    it('should set owners', done => {
      FiftyFifty.deployed().setOwners(accounts[0], accounts[1], args)
      .then(() => FiftyFifty.deployed().getOwners.call())
      .then(owners => {
        assert.equal(owners[0], accounts[0])
        assert.equal(owners[1], accounts[1])
        done()
      }).catch(done)
    })
    it('shold not be called two times', done => {
      var ff
      FiftyFifty.new(args).catch(done).then(contract => {
        ff = contract
        return ff.setOwners(accounts[0], accounts[1], args)
      })
      .then(() => {
        try {
          ff.setOwners(accounts[2], accounts[3], args)
          .then(() => done('error: setOwners called two times'))
          .catch(() => done())
        } catch (e) { done() }
      })
    })
  })

  describe('changeAddress', () => {
    it('should be called by first owner', done => {
      ff.changeAddress(accounts[2], {from: accounts[0]})
      .catch(done)
      .then(() => done())
    })
    it('should change first owner', done => {
      ff.changeAddress(accounts[2], {from: accounts[0]})
      .catch((done))
      .then(() => ff.getOwners.call())
      .then((owners) => {
        assert.equal(owners[0], accounts[2])
        assert.equal(owners[1], accounts[1])
        done()
      })
    })
    it('should be called by second owner', done => {
      ff.changeAddress(accounts[2], {from: accounts[1]})
      .catch(done)
      .then(txid => {
        assert.isDefined(txid)
        done()
      })
    })
    it('should change second owner', done => {
      ff.changeAddress(accounts[2], {from: accounts[1]})
      .catch((done))
      .then(() => ff.getOwners.call())
      .then((owners) => {
        assert.equal(owners[1], accounts[2])
        assert.equal(owners[0], accounts[0])
        done()
      })
    })
    it('should not be called', done => {
      ff.changeAddress(accounts[2], {from: accounts[2]})
      .catch(() => done())
      .then(txid => assert.isUndefined(txid))
    })
  })

  describe('getToDistribute', () => {
    it('should return 0', done => {
      ff.getToDistribute.call()
        .catch(done)
        .then(value => {
          assert.equal(value.toString(), '0')
          done()
        })
    })
    it('should return 10', done => {
      web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
      ff.getToDistribute.call()
        .catch(done)
        .then(value => {
          assert.equal(value.toString(), '10')
          done()
        })
    })
    it('should return 15 (call with value transfer)', done => {
      var res = ff.contract.getOwners.sendTransaction({from: accounts[0], to: ff.address, value: 15})
      ff.getToDistribute.call()
      .then(value => {
        assert.equal(value.toString(), '15')
        done()
      })
      .catch(done)
    })
  })

  describe('getOwedTo', () => {
    beforeEach(done => {
      var txid = web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
      assert.isString(txid)
      done()
    })
    it('should return 5', done => {
      ff.getOwedTo.call(accounts[0])
      .then(value => {
        assert.equal(value, 5)
        done()
      })
    })
    it('should return 5', done => {
      ff.getOwedTo.call(accounts[1])
      .then(value => {
        assert.equal(value, 5)
        done()
      })
    })
    it('should fail', done => {
      try {
        ff.getOwedTo.call(accounts[2])
        .then(value => done('Error: returned value ' + value))
        .catch(()=>done())
      } catch (e) { done() }
    })
  })

  describe('distribute', () => {
    var balances = []
    beforeEach(done => {
      var txid = web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
      assert.isString(txid)
      balances[0] = web3.eth.getBalance(accounts[0])
      balances[1] = web3.eth.getBalance(accounts[1])
      done()
    })
    ;[0, 1].forEach(i => {
      it('should send to ' + accounts[i], done => {
        ff.distribute({from: accounts[2]}).catch(done)
        .then(() => {
          var newBalance =  web3.eth.getBalance(accounts[i])
          var received = newBalance.minus(balances[i]).toNumber()
          assert.equal(received, 5)
          done()
        })
      })
    })
    it('should not send change', done => {
      web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 1})
      ff.distribute({from: accounts[2]}).catch(done)
      .then(() => {
        var contractBalance =  web3.eth.getBalance(ff.address).toNumber()
        assert.equal(contractBalance, 1)
        done()
      })
    })
  })

  describe('distribute with a failing address', () => {
    var balances = []
    var failContract
    var tests = [
      {addr: 'failing address', expected: 0, balance: null},
      {addr: accounts[1], expected: 5, balance: null}
    ]
    beforeEach(done => {
      args = { from: accounts[0] }
      FiftyFifty.new(args)
      .then(contract => {
        ff = contract
        return FailTransfer.new(args)
      })
      .then(contract => {
        failContract = contract
        tests[0].addr = contract.address
        return ff.setOwners(failContract.address, accounts[1], args)
      })
      .then(() => {
        var txid = web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
        assert.isString(txid)
        tests[0].balance = web3.eth.getBalance(tests[0].addr)
        tests[1].balance = web3.eth.getBalance(tests[1].addr)
        done()
      })
      .catch(done)
    })
    tests.forEach(testCase => {
      it(`should send ${testCase.expected} to ${testCase.addr}`, done => {
        ff.distribute({from: accounts[2]}).catch(done)
        .then(() => {
          var newBalance =  web3.eth.getBalance(testCase.addr)
          var received = newBalance.minus(testCase.balance).toNumber()
          assert.equal(received, testCase.expected)
          done()
        })
      })
      it(`should owe to ${testCase.addr}`, done => {
        ff.distribute({from: accounts[2]}).catch(done)
        .then(() => ff.getOwedTo.call(testCase.addr))
        .then(value => {
          assert.equal(value.toNumber(), 5 - testCase.expected)
          done()
        })
      })
    })
    //...
  })

})
