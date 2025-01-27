const express = require('express');
const path = require('path');

const app = express();

var contactRouter = require('./routes/contact');

// Configuración del motor de plantillas EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Servir archivos estáticos
// Configurar la ruta a los archivos estáticos usando una variable de entorno
const staticPath = process.env.STATIC_PATH || 'public';

app.use(express.static(path.join(__dirname, staticPath)));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// *** Rutas/secciones de la pagina web *** //

// Formulario, ContactsController & ContactsModel
app.use('/', contactRouter)

// Home
app.get('/', (req, res) => {
    res.render('index');
});

// Ubicación
app.get('/location', (req, res) => {
    res.render('location');
});

// Beneficios
app.get('/benefits', (req, res) => {
    res.render('benefits');
});

// Clientes
app.get('/customers', (req, res) => {
    res.render('customers');
});

// Servicios
app.get('/services', (req, res) => {
    res.render('services');
});

// Pagina de agradecimiento (formulario)
app.get('/thanks', (req, res) => {
    res.render('thanks');
});

// Mensaje personalizado de error
app.get('/error', (req, res) => {
    res.render('error');
})

// Puerto del servidor
const port = 2700;
app.listen(port, () => {
    console.log(`Servidor activo en el puerto ${port}\n`);
});

module.exports = app;