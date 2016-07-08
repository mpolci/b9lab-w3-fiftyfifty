'use strict'

angular.module('fiftyFiftyApp')
.controller('FiftyFiftyController', function FiftyFiftyController($scope) {
  var self = this;
  angular.extend(this, {
    contractAddress: '',
    contractBalance: '',
    owedBalances: [],
    owners: [],
    ownersBalances: [],
    accounts: [],
    selectedAccount: '',
    selectedBalance: '',
    sendAmountInput: '',
    setOwnersInputs: {
      addr1: '',
      addr2: ''
    },
    changeAddressInput: '',

    doRefresh: doRefresh,
    doSendToContract: doSendToContract,
    doDistribute: doDistribute,
    doSetOwners: doSetOwners,
    doChangeAddress: doChangeAddress,
    doDeployNewContract: doDeployNewContract
  })

  var contract = FiftyFifty.deployed()
  doRefresh()

  web3.eth.getAccounts(function (err, accounts) {
    if (err) return console.error(err)
    self.accounts = accounts
    $scope.$apply()
  })
  $scope.$watch(function () {
    return self.selectedAccount
  }, refreshSelectedBalance)

  /*********************************************************/

  function refreshSelectedBalance () {
    if (!self.selectedAccount) return
    web3.eth.getBalance(self.selectedAccount, function (err, value) {
      if (err) return console.error(err)
      set('selectedBalance', value)
    })
  }

  function doRefresh () {
    refreshSelectedBalance()
    self.contractAddress = contract.address
    web3.eth.getBalance(contract.address, function (err, value) {
      if (err) return console.error(err)
      set('contractBalance', value)
    })
    contract.getOwners.call()
    .then(function (owners) {
      set('owners', owners)
      ;[0,1].map(function (i) {
        var owner = owners[i];
        web3.eth.getBalance(owner, function (err, value) {
          if (err) return console.error(err)
          setArray('ownersBalances', i, value)
        })
        contract.getOwedTo.call(owner)
        .then(function (value) {
          setArray('owedBalances', i, value)
        })
        .catch(console.error)
      })
      // return null to avoid warning message
      return null
    })
    .catch(console.error)
  }

  function doSendToContract () {
    if (!self.selectedAccount) return
    web3.eth.sendTransaction({
      from: self.selectedAccount,
      to: self.contractAddress,
      value: self.sendAmountInput
    }, function (err, txid) {
      if (err) return console.error(err)
      console.log('New transaction: ' + txid)
      doRefresh()
    })
  }

  function doDistribute () {
    if (!self.selectedAccount) return
    contract.distribute({ from: self.selectedAccount })
    .then(logTxAndRefresh)
    .catch(console.error)
  }

  function doSetOwners () {
    if (!self.selectedAccount) return
    contract.setOwners(self.setOwnersInputs.addr1, self.setOwnersInputs.addr2,
                       { from: self.selectedAccount })
    .then(logTxAndRefresh)
    .catch(console.error)
  }

  function doChangeAddress () {
    if (!self.selectedAccount) return
    contract.changeAddress(self.changeAddressInput, { from: self.selectedAccount })
    .then(logTxAndRefresh)
    .catch(console.error)
  }

  function doDeployNewContract () {
    if (!self.selectedAccount) return
    FiftyFifty.new({from: self.selectedAccount})
    .then(function (newContract) {
      contract = newContract
      doRefresh()
      return null
    })
    .catch(console.error)
  }

  /*********************************************************/

  function set (item, value) {
    self[item] = value
    $scope.$apply()
  }

  function setArray (item, idx, value) {
    self[item][idx] = value
    $scope.$apply()
  }

  function logTxAndRefresh (txid) {
    console.log('New call transaction: ' + txid)
    doRefresh()
    // return null to avoid warning message
    return null
  }

  function callContract(callopts) {
    if (!self.selectedAccount) return
    function handleError(e) {
      console.error(e)
    }
    try {
      contract[callopts.method].call(callopts.args)
      .then(function (result) {
        console.log('Contract call simulation:', callopts, result)
        return contract[callopts.method](callopts.args)
      })
      .then(logTxAndRefresh)
      .catch(handleError)
    } catch (e) {
      handleError(e)
    }
    return new Promise(function(resolve, reject) {

    })
  }
})
