var express = require('express')
var bodyParser = require('body-parser') 
var axios = require("axios").default;
require('dotenv').config()
const { Configuration, OpenAIApi } = require('openai');

const token_WhatsApp = process.env.token_WhatsApp
const API_OPENAI = process.env.API_OPENAI


const lastMessages = [
  { role: 'system', content: 'Tu nombre es MarnaBot y saluda con tu nombre, estas aqui para solucionar cualquier problema al usuario' }
  //{ role: 'system', content: 'Actua como un asistente experto en estrategias de ventas , tu nombre es Javier y saluda con tu nombre y explicale al usuario que eres un asistente de ventas, tu tono es amargado y poco agradable' }
];

const config = new Configuration({
  apiKey: API_OPENAI
});
const openai = new OpenAIApi(config);

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.get("/", function (request, response) {
  response.send('Simple WhatsApp Webhook tester</br>There is no front-end, see server.js for implementation!');
});

app.get('/webhook', function (req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == 'javier'
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post("/webhook", async function (req, res) {
  let respuesta = "";

  // Mensaje entrante del usuario consola
  console.log(JSON.stringify(req.body));
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {

      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // Extraemos el mensaje del usuario
      let phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id; // Número del usuario 
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload

      lastMessages.push({ role: 'user', content: msg_body });

      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: lastMessages,
        temperature: 0.5, // Equilibrado
        max_tokens: 600,
      });

      // Obtenemos la respuesta del Modelo GPT 3.5
      respuesta = response.data.choices[0].message['content'];
      lastMessages.push(
        { role: 'assistant', content: respuesta }
      );

      // Si los mensajes guardados son mas de 10, eliminamos el primero.
      if (lastMessages.length >= 5) {
        console.log('Eliminando mensaje')
        //lastMessages.shift();
        lastMessages.splice(1, 1);
        //lastMessages.slice( 1, 1 );
      }
      axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url:
          "https://graph.facebook.com/v12.0/" + phone_number_id + "/messages?access_token=" + token_WhatsApp,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: respuesta },
        },
        headers: { "Content-Type": "application/json" },
      });
    }
    res.sendStatus(200);
  } else {
    // Devuelve un '404 no encontrado' si el evento no proviene de una API de WhatsApp
    res.sendStatus(404);
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});