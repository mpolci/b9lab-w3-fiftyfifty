
contract('FiftyFifty', accounts => {
  var ff
  var args
  beforeEach(done => {
    args = { from: accounts[0] }
    FiftyFifty.new(accounts[0], accounts[1], args).catch(done).then(contract => {
      if (contract) {
        ff = contract
        done()
      }
    })
  })

  describe('contructor', () => {
    it('should fail with address 0 on firt parameter', done => {
      try {
        FiftyFifty.new(0, accounts[1], args).catch(() => done()).then(contract => {
          contract && done('Error, contract created')
        })
      } catch (e) {
        done()
      }
    })
    it('should fail with address 0 on second parameter', done => {
      try {
        FiftyFifty.new(accounts[0], 0, args).catch(() => done()).then(contract => {
          contract && done('Error, contract created')
        })
      } catch (e) {
        done()
      }
    })
    it('should success', done => {
      try {
        FiftyFifty.new(accounts[0], accounts[1], args).then(() => done())
        .catch(done)
      } catch (e) {
        done(e)
      }
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
    var failContract
    var tests = [
      {descr: 'infinite loop', fc: 'FailTransfer2', addr: 'failing address', expected: 0},
      {descr: 'infinite loop', fc: 'FailTransfer2', addr: 'normal address', expected: 5},
      {descr: 'throw', fc: 'FailTransfer', addr: 'failing address', expected: 0},
      {descr: 'throw', fc: 'FailTransfer', addr: 'normal address', expected: 5},
    ]

    function initFailingHelper(testCase, done) {
      data = Object.assign({}, testCase)
      args = { from: accounts[0] }
      global[testCase.fc].new(args)
      .then(contract => {
        failContract = contract
        data.addr = testCase.addr === 'failing address'
          ? contract.address
          : accounts[1]
        return FiftyFifty.new(contract.address, accounts[1], args)
      })
      .then(contract => {
        assert.isNotNull(contract, 'contract was not created')
        ff = contract
        var txid = web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
        assert.isString(txid)
        data.balance = web3.eth.getBalance(data.addr)
        done(data)
      })
      .catch(done)
    }
    tests.forEach(testCase => {
      it(`${testCase.descr} - should send ${testCase.expected} to ${testCase.addr}`, done => {
        initFailingHelper(testCase, data => {
          ff.distribute({from: accounts[2]}).catch(done)
          .then(() => {
            var newBalance =  web3.eth.getBalance(data.addr)
            var received = newBalance.minus(data.balance).toNumber()
            assert.equal(received, data.expected)
            done()
          })
        })
      })
      it(`${testCase.descr} - should owe to ${testCase.addr}`, done => {
        initFailingHelper(testCase, data => {
          ff.distribute({from: accounts[2]}).catch(done)
          .then(() => ff.getOwedTo.call(data.addr))
          .then(value => {
            assert.equal(value.toNumber(), 5 - data.expected)
            done()
          })
        })

      })
    })
    //...
  })
  

})
