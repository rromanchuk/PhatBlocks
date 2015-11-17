var async = require('async')
var bitcoind = require("bitcoin")
var _ = require('lodash');
var bitcoinjs = require("bitcoinjs-lib")

FAUCET = "n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi"
var batch = [];
var addresses = []
var randomKeyPair = bitcoinjs.ECPair.makeRandom({network: bitcoinjs.networks.testnet})

var client = new bitcoind.Client({
  host: 'localhost',
  port: yourport,
  user: 'youruser',
  pass: 'yourpass',
  timeout: 30000
});


async.waterfall([
    function (callback) {
      console.log("Fetching 3 new receiving addresses to use as outputs")
      client.getNewAddress(function(err, result) {
        console.log("New address -> ", result)
        addresses.push(result)
        callback(err, result)
      });
    },
    function (address, callback) {
      client.getNewAddress(function(err, result) {
        console.log("New address -> ", result)
        addresses.push(result)
        callback(err, result)
      });
    },
    function (address, callback) {
      client.getNewAddress(function(err, result) {
        console.log("New address -> ", result)
        addresses.push(result)
        callback(err, result)
      });
    },
    function (address, cb) {
      console.log("Looking for UTXOs to use")
      client.listUnspent(0, 9999999, function(err, utxos) {

        async.eachSeries(_.chunk(utxos, 3), function(utxos, callback) {
          console.log("Found a UTXO to work with");
          //console.log("UTXO -> ", utxo)
          if (batch.length > 100) {
            console.log("Woah, you've been busy, let's broadcast!")
            push()
          }
          createRaw(utxos, amounts(utxos), callback)
          }, function(err) {
            console.log("Finished processing a utxo")
            cb(err, true)
        });    
      });
    }
], function (err, result) {
    console.log("All done, sorry luke-jr")
    console.log(addresses)
    if (err) {
      console.log(err);
    }
    push()
})
  
  function push() {
    console.log("Sending a batch of " + batch.length + " transactions")
    client.cmd(batch, function(err, txid, resHeaders) {
      batch = []
      if (err) {
        console.log(err); 
      } else {
        console.log('SUCESS txid -> ', txid);
      }
    });
  }

  function amounts(utxos) {
    var amounts = {}
    var value = _.sum(_.map(utxos, 'amount'));

    console.log("Toal UTXO Value ->", value);
    var satoshisTo = getSatoshisBTC();
    var feeRate = getFeeRate();
    var bytes = 148 * utxos.length + 34 * 2 + 10
    console.log("Toal KB ->", bytes/ 1000);
    var fees = (bytes / 1000) * feeRate

    console.log("Fee rate -> ", feeRate);
    console.log("Fees paying -> ", fees);
   
    if (satoshisTo > (value - fees)) {
      //value = value - fees
      console.log("This is a small utxo, lets burn it all");
      console.log("Amount to faucet -> ", value);
      amounts[FAUCET] = value
    } else {
      
      var externalSatoshi = satoshisTo/2
      console.log("Sending to external addresses -> ",  satoshisTo);

      amounts[FAUCET] = externalSatoshi
      console.log("Amount to faucet -> ", externalSatoshi);
      amounts[randomKeyPair.getAddress()] = externalSatoshi
      console.log("Stranger -> ", externalSatoshi);

      value = value - fees - satoshisTo
      var backToUs = value/3
      amounts[addresses[0]] = backToUs
      console.log("Amount to us -> ", backToUs);
      amounts[addresses[1]] = backToUs
      console.log("Amount to us -> ", backToUs);
      amounts[addresses[2]] = backToUs
      console.log("Amount to us -> ", backToUs);
    }
    return amounts
  }

  function createRaw(utxos, outputs, callback) {
    console.log("\n\n")
    console.log("Inputs -> ", JSON.stringify(utxos, null, 2))
    console.log("Outputs -> ", JSON.stringify(outputs, null, 2))
    console.log("\n\n")
    client.createRawTransaction(utxos, outputs, function(err, rawTx) {
      if (err) {
        console.log(err)
      } else {
        console.log("RawTx -> ", rawTx);
        client.signRawTransaction(rawTx, function(err, resp) {
          if (err) {
            console.log(err)
          } else {
            console.log("Hex -> ", resp.hex);
            batch.push({
              method: 'sendrawtransaction',
              params: [resp.hex]
            });
          }
          callback()
        });
      }
    });
  }

  function getFeeRate() {
    return (Math.random() * (0.001 - 0.0001) + 0.0001);
  }

  function getSatoshisBTC() {
    return Math.random() * (0.001 - 0.0000001) + 0.0000001;
  }  
    
    
