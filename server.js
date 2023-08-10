const express = require('express');
const path = require('path');
const db = require('./public/js/db.js');
const NodeCache = require('node-cache');
const bodyParser = require('body-parser');
const utils = require('./utils.js')

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
// Middleware para analizar los datos enviados en el cuerpo de la solicitud
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Manejador de errores personalizado
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { mensaje: 'Error en el servidor.' }); // Renderizar la vista de error.ejs
});

// Configuración para servir archivos estáticos (HTML, CSS, JS, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});



const CacheReciente = new NodeCache({ stdTTL: 3600 });

app.get('/', (req, res) => {
    const cachedData = CacheReciente.get('index');

    if (cachedData) {
        res.render('index', cachedData);
    } else {

        db.obtenerPeliculasIndex(8).then((Peliculas) => {
            const data = {
                HTML_Recent_Movies: utils.generarHTMLPeliculas(Peliculas.recientes, 4),
                HTML_Accion_Movies: utils.generarHTMLPeliculas(Peliculas.accion, 4),
                HTML_Comedia_Movies: utils.generarHTMLPeliculas(Peliculas.comedia, 4)
            };

            CacheReciente.set('index', data);
            res.render('index', data);
        })
    }

});

app.get('/movies/reproductor/:movieID', (req, res) => {
    const movieID = req.params.movieID;

    db.buscarPeliculaPorUrl(movieLink).then((Pelicula) => {
        if (Pelicula) {
            // Si se encontró la película, renderiza la vista 'movie.ejs' con los datos de la película
            const data = {
                movieTitle: Pelicula.title,
                movieSubtitle: Pelicula.subtitle,
                movieYear: Pelicula.year,
                movieCategories: Pelicula.genre.join(' / '),
                peliculasSimilares: Pelicula.peliculas_similares,
                director: Pelicula.director,
                reparto_principal: Pelicula.reparto_principal,
                calidades: Pelicula.calidades,
                background_url: Pelicula.background,
                portada: Pelicula.portada,
                screenshots_image: Pelicula.screenshots_image,
                embed_youtube: Pelicula.embed_youtube,
                tags: Pelicula.tags,
                generos: Pelicula.genre,
                country: Pelicula.country
            };
            res.render('movie.ejs', data);
        } else {
            // Si no se encontró la película, renderiza una vista de error
            res.render('error', { mensaje: 'No se encontró la película.' });
        }
    })


});

// Define una ruta para los enlaces de películas dinámicas
app.get('/movies/:movieLink', (req, res) => {
    const movieLink = req.params.movieLink;

    db.buscarPeliculaPorUrl(movieLink).then((Pelicula) => {
        if (Pelicula) {
            // Si se encontró la película, renderiza la vista 'movie.ejs' con los datos de la película
            const data = {
                movieTitle: Pelicula.title,
                movieSubtitle: Pelicula.subtitle,
                movieYear: Pelicula.year,
                movieCategories: Pelicula.genre.join(' / '),
                peliculasSimilares: Pelicula.peliculas_similares,
                director: Pelicula.director,
                reparto_principal: Pelicula.reparto_principal,
                calidades: Pelicula.calidades,
                background_url: Pelicula.background,
                portada: Pelicula.portada,
                screenshots_image: Pelicula.screenshots_image,
                embed_youtube: Pelicula.embed_youtube,
                tags: Pelicula.tags,
                generos: Pelicula.genre,
                country: Pelicula.country
            };
            res.render('movie.ejs', data);
        } else {
            // Si no se encontró la película, renderiza una vista de error
            res.render('error', { mensaje: 'No se encontró la película.' });
        }
    })


});

app.get('/trending-movies', (req, res) => {
    const cachedData = CacheReciente.get('trendingMovies');

    if (cachedData) {
        res.render('trending-movies', cachedData);
    } else {
        db.buscarPeliculasAleatorias().then((Peliculas) => {
            const data = {
                movies: Peliculas
            };
            CacheReciente.set('trendingMovies', data);
            res.render('trending-movies', data);
        })

    }

});

app.get('/browse-movies', (req, res) => {
    const pageNumber = parseInt(req.query.page, 10) || 1;
    const cachedData = CacheReciente.get('browseMovies');

    if (cachedData && pageNumber == 1) {
        console.log('PAGINA', pageNumber)
        res.render('browse-movies', cachedData);
    } else {
        db.buscarPeliculas('', 20, true, pageNumber, 'all', 'all', 'all').then((Peliculas) => {
            const data = {
                HTML_Movies_Search: utils.generarHTMLPeliculas(Peliculas.results, null),
                NavPagination: utils.generatePaginationHTML('/browse-movies', Peliculas.totalPages, pageNumber),
                TitleSearch: ''
            };
            CacheReciente.set('browseMovies', data);
            res.render('browse-movies', data);
        })

    }
});

app.get('/browse-movies/:title/:quality/:genre/:rating/:order_by/:year/:language', (req, res) => {
    const pageNumber = parseInt(req.query.page, 10) || 1;
    const fullUrl = req.path;
    const title = req.params.title === '0' ? '' : req.params.title;
    const quality = req.params.quality;
    const genre = req.params.genre;
    const rating = req.params.rating;
    const order_by = req.params.order_by;
    const year = req.params.year;
    const language = req.params.language;


    db.buscarPeliculas(title, 20, true, pageNumber, quality, genre, language, rating, year).then((Peliculas) => {
        const data = {
            HTML_Movies_Search: utils.generarHTMLPeliculas(Peliculas.results, null),
            NavPagination: utils.generatePaginationHTML(fullUrl, Peliculas.totalPages, pageNumber),
            TitleSearch: title
        };
        res.render('browse-movies', data);
    })


});



app.get('/ajax/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ status: 'error', message: 'Debe proporcionar un parámetro de búsqueda (query).' });
        }

        db.buscarPeliculas(query, 5).then((Peliculas) => {
            const responseData = Peliculas.results.map(pelicula => {
                return {
                    url: pelicula.url,
                    img: pelicula.portada,
                    title: pelicula.title,
                    year: pelicula.year
                };
            });

            res.json({
                status: 'ok',
                data: responseData,
                message: 'Resultados de búsqueda encontrados.'
            });
        })

    } catch (err) {
        console.error('Error al buscar las películas:', err);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
});


