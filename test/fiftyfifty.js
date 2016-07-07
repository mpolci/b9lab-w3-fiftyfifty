contract('FiftyFifty', function(accounts) {
  var ff;
  var args;
  beforeEach(function (done) {
    args = { from: accounts[0] };
    FiftyFifty.new(args).catch(done).then(function (contract) {
      ff = contract;
      ff.setOwners(accounts[0], accounts[1], args)
        .then(function(){done()}).catch(done);
    })
  })
  describe('setOwners', function () {
    it('should call setOwners', function (done) {
      FiftyFifty.deployed().setOwners(accounts[0], accounts[1], args)
        .then(function(){done()}).catch(done);
    });
    it('shold not be called two times', function (done) {

      FiftyFifty.new(args).catch(done).then(function (contract) {
        var ff = contract;

        ff.setOwners(accounts[0], accounts[1], args)
          .catch(done)
          .then(function () {
            try {
              ff.setOwners(accounts[2], accounts[3], args)
                .then(function () {
                  done('error: setOwners called two times')
                })
                .catch(function(){done()});
            } catch (e) { done() }
          });
      });
    });
  })

  describe('getToDistribute', function () {
    it('should return 0', function (done) {
      ff.getToDistribute.call()
        .catch(done)
        .then(function (value) {
          assert.equal(value.toString(), '0')
          done()
        })
    })
    it('should return 10', function (done) {
      web3.eth.sendTransaction({from: accounts[0], to: ff.address, value: 10})
      ff.getToDistribute.call()
        .catch(done)
        .then(function (value) {
          assert.equal(value.toString(), '10');
          done()
        })
    })
    it('should return 15', function (done) {
      var res = ff.contract.getOwners.sendTransaction({from: accounts[0], to: ff.address, value: 15});
      ff.getToDistribute.call()
      .then(function (value) {
        assert.equal(value.toString(), '15');
        done()
      })
      .catch(done)
    })
  })

});
