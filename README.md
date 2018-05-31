# http-domain-based-forwarding
 forward https/http requests based on domain\ip of request
 
 support SSE implementation
  
## Installing

```
npm install --save http-domain-based-forwarding
```

## Sample use

```js
var http = require('http');
var express = require('express');
var app = new express(); // Init the express app

var http_domain_based_forwarding = require('http-domain-based-forwarding');

// Init the forwarding/proxy routing
// (the recived host ip\domain is the key and value is URL of target)
var domain_proxy = new http_domain_based_forwarding({
  '127.0.0.1': 'http://127.0.0.1:80',
  'localhost': 'https://127.0.0.1:443'
});

app.use(domain_proxy.express_middleware);

http.createServer(app).listen(80, () => {
  console.info('http proxy run on port ' + 80);
});
```



 
 
