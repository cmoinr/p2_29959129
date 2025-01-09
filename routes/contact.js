const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const { DateTime } = require('luxon');
require('dotenv').config();

const accountTransport = { // require("./account_transport.json");
    service: "gmail",
    auth: {
        type: "OAuth2",            
        user: process.env.MAIN_EMAIL,
        clientId: process.env.CLIENT_ID_OAUTH,
        clientSecret: process.env.CLIENT_SECRET_OAUTH,
        refreshToken: process.env.REFRESH_TOKEN_OAUTH
    }
}

// Contacto (formulario)
router.get('/contact', (req, res) => {
    res.render('contact');
});

// Funcion para verificar el token (reCAPTCHA)
const verifyCaptcha = async (token, ip) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verify = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}&remoteip=${ip}`;

    try {
        const recaptcha = await axios.post(verify);
        if (recaptcha.data.success) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
};

// Configurar el transporte del correo electronico
const mail_rover = async (callback) => {

    const oauth2Client = new OAuth2(
        accountTransport.auth.clientId,
        accountTransport.auth.clientSecret,
        "https://developers.google.com/oauthplayground",
    );
    oauth2Client.setCredentials({
        refresh_token: accountTransport.auth.refreshToken,
        tls: {
            rejectUnauthorized: false
        }
    });
    oauth2Client.getAccessToken((err, token) => {
        if (err)
            return console.log(err);;
        accountTransport.auth.accessToken = token;
        callback(nodemailer.createTransport(accountTransport));
    });
};

// Funcion para el envio del correo electronico
const sendEmail = async (name, email, message, userIP, country, date) => {
    return new Promise((resolve, reject) => {
        mail_rover(async (transporter) => {
            const formattedDate = DateTime.fromISO(date) 
            .setZone('America/Caracas') 
            .toFormat('dd/MM/yyyy HH:mm:ss');
            
            try {
                const info = await transporter.sendMail({
                    from: `GreenLeaves <${process.env.MAIN_EMAIL}>`,
                    to: ['programacion2ais@dispostable.com', 'nieves.carlos5a@gmail.com'],
                    subject: 'GreenLeaves | Formulario de contacto',
                    text: `
                    Nombre: ${name}
                    Correo: ${email}
                    Comentario: ${message}
                    IP: ${userIP}
                    País: ${country}
                    Fecha/Hora: ${formattedDate}
                    `
                });
                console.log('Mensaje enviado:', info.messageId);
                resolve(info);
            } catch (error) {
                console.error('Error al enviar el correo:', error);
                reject(error);
            }
        });
    });
};

// ContactsModel
class ContactsModel {
    constructor() {
        // Conexion a la base de datos
        this.db = new sqlite3.Database('db.sqlite');
        this.db.run('CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, name TEXT, message TEXT, ip TEXT, date TEXT)');
    }
    // Guardar los datos del formulario
    async save(email, name, message, ip, date, country) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO contacts (email, name, message, ip, date, country) VALUES (?, ?, ?, ?, ?, ?)', [email, name, message, ip, date, country], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    // Recuperar los datos guardados en la base de datos
    async get_info() {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM contacts', (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
}

// Acceso a la clase 'ContactsModel'
const contactosModel = new ContactsModel();

// ContactsController
router.post('/send', async (req, res) => {
    // Datos obtenidos del formulario
    const { email, name, message, userIP, "g-recaptcha-response": token } = req.body;
    const date = new Date().toISOString();

    // Uso de la API [ipstack.com] (geolocalización por IP)
    const response = await axios.get(`http://api.ipstack.com/${userIP}?access_key=${process.env.IPSTACK_ACCESS_KEY}`);
    const country = response.data.country_name;

    // Validar los datos del formulario antes de guardarlos
    if (!email || !name || !message || !token) {
        return res.status(400).send('Por favor, completa todos los campos (incluyendo el reCAPTCHA)');
    }

    // Verificar la validez del token (reCAPTCHA)
    if (verifyCaptcha(token, userIP)) {       
        // Envio del correo electronico
        sendEmail(name, email, message, userIP, country, date)
        .then(async (info) => {
            console.log('Mail sent:', info);

            // Si el correo se envió correctamente...
            try {
                // Llamar a la clase ContactosModel para guardar los datos
                await contactosModel.save(email, name, message, userIP, date, country);
                // Redireccionar al usuario a una página de confirmación o mostrar un mensaje de éxito
                res.redirect('/thanks');
            } catch (error) {
                console.error('Error al guardar los datos:', error);
            }
        })
        .catch(error => {
            console.error('Mail error:', error);
        });
    } else {
        res.status(400).send('reCAPTCHA: error de validacion');
    }
});


// Muestra la informacion guardada en la base de datos
contactosModel.get_info()
    .then(contacts => {
        console.log("Database:\n");
        console.log(contacts);
    })
    .catch(err => {
        console.error('Error:', err);
    });


module.exports = router;