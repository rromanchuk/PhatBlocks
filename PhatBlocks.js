var async = require('async')
var bitcoind = require("bitcoin")

var batch = [];
var addresses = []


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
        async.eachSeries(utxos, function(utxo, callback) {
          console.log("Found a UTXO to work with");
          //console.log("UTXO -> ", utxo)
          if (batch.length > 100) {
            console.log("Woah, you've been busy, let's broadcast!")
            push()
          }
          createRaw([utxo], amounts(utxo.amount), callback)
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
        //createTransaction(utxo, value)
      }
    });
  }

  function amounts(value) {
    var satoshisTo = getSatoshisBTC();
    var fees = satoshisTo * 0.0002;
    console.log("UTXO amount to work with -> ", value);
    console.log("Sending back to faucet (external address) -> ",  satoshisTo);
    console.log("Fees paying -> ", fees);

    if (satoshisTo > (value - fees)) {
      value = value - fees
      console.log("This is a small utxo, lets burn it all");
      console.log("Amount to faucet -> ", value);
      return {"n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi": value}
    } else {
      value = value - fees - satoshisTo
      
      var backToUs = value/3
      var amounts = {}
      amounts[addresses[0]] = backToUs
      console.log("Amount to us -> ", backToUs);
      amounts[addresses[1]] = backToUs
      console.log("Amount to us -> ", backToUs);
      amounts[addresses[2]] = backToUs
      console.log("Amount to us -> ", backToUs);
      amounts["n2eMqTT929pb1RDNuqEnxdaLau1rxy3efi"] = satoshisTo
      console.log("Amount to faucet -> ", value);
      return amounts
    }

  }

  function createRaw(utxos, outputs, callback) {
    console.log("\n\n")
    //console.log("UTXOs -> ", JSON.stringify(utxos, null, 2))
    console.log("Outputs -> ", JSON.stringify(outputs, null, 2))
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

  function getSatoshisBTC() {
    return Math.random() * (0.0001 - 0.0000001) + 0.0000001;
  }  
