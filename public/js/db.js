require('dotenv').config(); // Cargar variables de entorno desde .env
const { MongoClient } = require('mongodb');

const mongoURI = process.env.MONGO_URI; // Utiliza la variable de entorno para la URI de MongoDB
const dbName = process.env.DB_NAME; // Utiliza la variable de entorno para el nombre de la base de datos

let db;
async function conectar() {
    try {
        const client = await MongoClient.connect(mongoURI, { useUnifiedTopology: true });
        db = client.db(dbName);
        console.log('Conectado a MongoDB');
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
        process.exit(1); // Salir del proceso con error
    }
}
conectar()

function obtenerConexion() {
    if (!db) {
        throw new Error('La conexión a MongoDB no ha sido establecida. Asegúrate de llamar a conectar() primero.');
    }
    return db;
}

async function buscarPeliculaPorUrl(url) {
    const collection = obtenerConexion().collection('YTS');
    try {
        const pelicula = await collection.findOne({ url: url });
        return pelicula;
    } catch (error) {
        console.error('Error al obtener la película:', error);
        throw error;
    }
}

async function buscarPeliculasAleatorias(limit = 300) {
    const collection = obtenerConexion().collection('YTS');

    const query = {
        rating: { $gt: 5 },
        rating_count: { $gt: 1000 },
        year: { $gte: 2015 }
    };

    try {
        // Realizar la búsqueda con los criterios y obtener los resultados aleatorios paginados
        const peliculasAleatorias = await collection
            .find(query)
            .limit(limit)
            .toArray();

        if (peliculasAleatorias && peliculasAleatorias.length > 0) {
            const peliculasRandom = Array.from({ length: 15 }, () => {
                return peliculasAleatorias[Math.floor(Math.random() * peliculasAleatorias.length)];
            });

            return peliculasRandom;
        } else {
            return [];
        }

        return peliculasAleatorias;
    } catch (error) {
        console.error('Error al obtener las películas aleatorias:', error);
        throw error;
    }
}


function generarFiltroBusquedaPorNombre(nombre) {
    if (nombre === "") {
        return "";
    } else {
        console.log([nombre])
        console.log(nombre)
        const filters = {
            $or: [
                {
                    title_buscar: {
                        $options: 'i',
                        $regex: quitarAcentos(nombre)
                    }
                },
                {
                    'director.name': {
                        $options: 'i',
                        $regex: nombre
                    }
                },
                {
                    'reparto_principal.name': {
                        $options: 'i',
                        $regex: nombre
                    }
                }
            ]
        };
        return filters;
    }
}

// Función para quitar acentos de un texto
function quitarAcentos(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}


async function buscarPeliculas(title, limit, paginaMax, paginaActual, calidad, genero, idioma, rating, year) {
    const collection = obtenerConexion().collection('YTS');

    const query = {};

    // Filtrar por título usando la función generarFiltroBusquedaPorNombre
    const nombreFilter = generarFiltroBusquedaPorNombre(title);
    if (nombreFilter) {
        query.$or = nombreFilter.$or;
    }

    // Filtrar por calidad si se proporciona
    if (calidad && calidad !== 'all') {
        query['calidades.calidad'] = { $regex: calidad }
    }

    // Filtrar por género si se proporciona
    if (genero && genero !== 'all') {
        query.genre = genero;
    }

    // Filtrar por idioma si se proporciona
    if (idioma && idioma !== 'all') {
        query['country.abreviacion'] = idioma;
    }

    if (rating && rating !== '0' && !isNaN(parseInt(rating))) {
        query.rating = { $gte: parseInt(rating) };
    }

    if (year && year !== '0') {
        if (year.includes('-')) {
            // Si el valor contiene un guion, representa un rango de años (por ejemplo, "1950-1969")
            const [startYear, endYear] = year.split('-');
            query.year = { $gte: parseInt(startYear), $lte: parseInt(endYear) };
        } else {
            // Si no contiene guion, representa un año específico
            query.year = parseInt(year);
        }
    }

    console.log(query)
    try {
        const skipDocs = (paginaActual - 1) * limit;
        console.log(skipDocs)
        // Realizar la búsqueda con regex y obtener los resultados paginados
        const Peliculas = await collection
            .find(query)
            .skip(skipDocs)
            .sort({ "_id": -1 }) // Ordenamos por fecha de lanzamiento en orden descendente
            .limit(limit)
            .toArray();

        if (paginaMax) {
            // Obtener la cantidad total de documentos que coinciden con el término de búsqueda
            const totalCount = await collection.countDocuments(query);

            // Calcular el número de páginas en base al total de documentos y el límite por página
            const totalPages = Math.ceil(totalCount / limit);

            // Devolver los resultados y la cantidad total de páginas como un objeto
            return { results: Peliculas, totalPages: totalPages };
        }
        else {
            return { results: Peliculas };
        }
    } catch (error) {
        console.error('Error al obtener las películas:', error);
        throw error;
    }
}

async function obtenerPeliculasIndex(limit) {
    const collection = obtenerConexion().collection('YTS');
    try {
        const PeliculasRecientes = await collection
            .find({})
            .sort({ "_id": -1 })
            .limit(limit)
            .toArray();

        // Obtener los IDs de las películas recientes
        const idsPeliculasRecientes = PeliculasRecientes.map((pelicula) => pelicula._id);

        // Buscar las películas de acción que no estén en la lista de películas recientes
        const PeliculasAccion = await collection
            .find({
                $and: [
                    { genre: "Acción" },
                    { _id: { $nin: idsPeliculasRecientes } },
                    { genre: { $ne: "Documental" } },
                    { genre: { $ne: "Animación" } }
                ]
            })
            .sort({ "_id": -1 })
            .limit(limit)
            .toArray();

        const idsPeliculasAccion = PeliculasAccion.map((pelicula) => pelicula._id)
        const Peliculas_Comedia = await collection
            .find({
                $and: [
                    { genre: "Comedia" },
                    { _id: { $nin: [...idsPeliculasRecientes, ...idsPeliculasAccion] } },
                ]
            })
            .sort({ "_id": -1 })
            .limit(limit)
            .toArray();

        return { 'recientes': PeliculasRecientes, 'accion': PeliculasAccion, "comedia": Peliculas_Comedia };
    } catch (error) {
        console.error('Error al obtener las películas del index:', error);
        throw error;
    }
}

module.exports = {
    obtenerConexion,
    obtenerPeliculasIndex,
    buscarPeliculaPorUrl,
    buscarPeliculas,
    buscarPeliculasAleatorias
};