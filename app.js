var express = require('express');
var exphbs  = require('express-handlebars');
const mercadopago = require('mercadopago');
const bodyParser = require('body-parser');
const fs = require('fs')
var port = process.env.PORT || 3000

var app = express();

const BASE_URL = 'http://frupp-mp-commerce-nodejs.herokuapp.com/';

const testBuyer = {
    id: 471923173,
    email: 'test_user_63274575@testuser.com',
    password: 'qatest2417'
};

const testSeller = {
    collector_id: 469485398,
    publicKey: 'APP_USR-7eb0138a-189f-4bec-87d1-c0504ead5626',
    accessToken: 'APP_USR-6317427424180639-042414-47e969706991d3a442922b0702a0da44-469485398'
};

mercadopago.configure({
    access_token: testSeller.accessToken,
    integrator_id: 'dev_24c65fb163bf11ea96500242ac130004'
});

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static('assets'));
 
app.use('/assets', express.static(__dirname + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/detail', function (req, res) {
    res.render('detail', req.query);
});

app.post('/checkout', (req, res) => {
   const { img, title, price, unit } = req.body;

   const preference = {
       items: [
           {
               id: 1234,
               title: title,
               description: "Dispositivo móvil de Tienda e-commerce",
               unit_price: Number.parseFloat(price),
               quantity: Number.parseInt(unit),
               picture_url: img
           }
       ],
       payer: {
           name: 'Lalo Landa',
           email: testBuyer.email,
           phone: {
               area_code: "11",
               number: 22223333
           },
           address: {
               zip_code: "1111",
               street_name: 'False',
               street_number: 123
           }
       },
       external_reference: "frupp@quaresitsolutions.com",
       payment_methods: {
           excluded_payment_methods: [{
               "id": "amex"
           }],
           excluded_payment_types: [{
               "id": "atm"
           }],
           installments: 6
       },
       back_urls: {
           success: BASE_URL + 'success',
           pending: BASE_URL + 'pending',
           failure: BASE_URL + 'failure'
       },
       notification_url: BASE_URL + 'notifications',
       auto_return: "approved"
   };

   mercadopago.preferences.create(preference).then(response => {
       console.log(response);

       const jsonFile = require('./logs.json');

       jsonFile.messages.push({
           preference_id: response.body.id,
           preference: response,
           responses: []
       });

       fs.writeFileSync('./logs.json', JSON.stringify(jsonFile));

       res.redirect(response.body.init_point);
   }).catch(err => res.render('home'));

});

app.post('/success', (req, res) => {
    res.render('success', req.query);
});

app.post('/pending', (req, res) => {
    res.sendStatus(200);
});

app.post('/failure', (req, res) => {
    res.sendStatus(200);
});

app.get('/logs', (req, res) => {
    const jsonFile = require('./logs.json');
    res.send(jsonFile);
});

app.get('/errors', (req, res) => {
    const jsonFile = require('./errors.json');
    res.send(jsonFile);
});

app.post('/notifications', (req, res) => {
    const jsonFile = require('./logs.json');

    const notificationType = req.body.type;
    const id = req.body.data.id;

    let searchObject;
    switch(notificationType){
        case 'payment':
            searchObject = mercadopago.payment;
            break;
        case 'plan':
            searchObject = mercadopago.plan;
            break;
        case 'subscription':
            searchObject = mercadopago.subscription;
            break;
        case 'invoice':
            searchObject = mercadopago.subscription;
            break;
        default:
            throw new Error();
    }

     const dataToSave = searchObject.findById(id);

    const message = jsonFile.messages.find(obj => obj.preference_id == id );
    const index = jsonFile.messages.indexOf(message);

    if(!index || !message){
        const errorFile = require('./errors.json');
        errorFile.errors.push([req.body, dataToSave]);
        fs.writeFileSync('./errors.json', JSON.stringify(errorFile));
    } else {
        message.responses.push([req.body, dataToSave]);
        jsonFile.messages[index] = message;
    }

    fs.writeFileSync('./logs.json', JSON.stringify(jsonFile));

    res.sendStatus(200);
});


app.listen(port);
