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
    error: null,

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
    self.error = null
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
    if (!self.selectedAccount) return selectedAccountError()
    web3.eth.sendTransaction({
      from: self.selectedAccount,
      to: self.contractAddress,
      value: self.sendAmountInput
    }, function (err, txid) {
      if (err) return handleError(err, 'tx-fail')
      logTxAndRefresh(txid)
    })
  }

  function doDistribute () {
    callContract({
      method: 'distribute',
      args: []
    })
  }

  function doSetOwners () {
    callContract({
      method: 'setOwners',
      args: [self.setOwnersInputs.addr1, self.setOwnersInputs.addr2]
    })
  }

  function doChangeAddress () {
    callContract({
      method: 'changeAddress',
      args: [self.changeAddressInput]
    })
  }

  function doDeployNewContract () {
    if (!self.selectedAccount) return selectedAccountError()

    FiftyFifty.new({from: self.selectedAccount})
    .then(function (newContract) {
      contract = newContract
      doRefresh()
      return null
    })
    .catch(console.error)
  }

  /*********************************************************/

  function callContract(callopts) {
    if (!self.selectedAccount) return selectedAccountError()
    callopts.args.push({ from: self.selectedAccount })
    try {
      console.log('Contract call simulation:', callopts)
      var method = contract[callopts.method]
      method.call.apply(method, callopts.args)
      .then(function (result) {
        console.log('Simulation result:', result)
        return method.apply(contract, callopts.args)
      })
      .then(logTxAndRefresh)
      .catch(e => handleError(e, 'tx-fail'))
    } catch (e) {
      handleError(e, 'call-fail')
    }
  }

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

  function selectedAccountError() {
    console.error('Account needed to interoperate with the contract');
    self.error = 'account'
  }

  function handleError(e, errid) {
    console.error(e)
    self.error = errid || (e.message && e.message.startsWith('Error: VM Exception while executing eth_call'))
      ? 'call-fail'
      : 'generic'
    $scope.$apply()
  }

})
