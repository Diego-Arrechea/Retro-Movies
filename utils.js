function generarHTMLPelicula(index, nombrePelicula, añoPelicula, ratingPelicula, generosPelicula, imagenURL, enlaceURL, country) {
    const columnClass = index ? 'col-sm-5' : 'col-sm-4 col-md-5 col-lg-4';
    console.log(country)
    const CountryHTML = country ? `<span style="color: #ACD7DE; font-size: 75%;">[${country.name.toUpperCase()}]</span>` : ''
    nombrePelicula = CountryHTML ? ` ${nombrePelicula}` : nombrePelicula

    const generosHTML = generosPelicula.slice(0, 2).map(genero => `<h4>${genero}</h4>`).join('');
    return `
    <div class="browse-movie-wrap col-xs-10 ${columnClass}">
      <a href="/movies/${enlaceURL}" class="browse-movie-link">
        <figure>
          <img class="img-responsive" src="${imagenURL}" alt="${nombrePelicula} (${añoPelicula}) descargar" width="170" height="255">
          <figcaption class="hidden-xs hidden-sm">
            <span class="icon-star"></span>
            <h4 class="rating">${ratingPelicula} / 10</h4>
            <h4>${generosHTML}</h4>
            <span class="button-green-download2-big">Ver Detalles</span>
          </figcaption>
        </figure>
      </a>
      <div class="browse-movie-bottom">
        <a href="/movies/${enlaceURL}" class="browse-movie-title">${CountryHTML}${nombrePelicula}</a>
        <div class="browse-movie-year">${añoPelicula}</div>
      </div>
    </div>
  `;
}

function generarHTMLPeliculas(peliculas, numPorFila) {
    if (peliculas.length === 0) {
        // Si no hay coincidencias con la búsqueda, mostramos un mensaje con estilo Bootstrap.
        return `
      <div class="alert alert-dark text-center" role="alert" style="font-size: 18px;">
        No se encontraron películas que coincidan con su búsqueda.
      </div>
    `;
    }

    let peliculasHTML = '';

    if (numPorFila === null) {
        // Todas las películas en un solo div.row
        peliculasHTML = peliculas.map(pelicula => generarHTMLPelicula(
            false,
            pelicula.title,
            pelicula.year,
            pelicula.rating,
            pelicula.genre,
            pelicula.portada,
            pelicula.url,
            pelicula.country
        )).join('');
        return `<div class="row">${peliculasHTML}</div>`;
    }

    // Agrupar las películas en divs.row de tamaño numPorFila
    let contador = 0;
    peliculas.forEach((pelicula, index) => {
        contador++;
        const peliculaHTML = generarHTMLPelicula(
            true,
            pelicula.title,
            pelicula.year,
            pelicula.rating,
            pelicula.genre,
            pelicula.portada,
            pelicula.url,
            pelicula.country
        );

        if (contador % numPorFila === 1) {
            peliculasHTML += '<div class="row">';
        }

        peliculasHTML += peliculaHTML;

        if (contador % numPorFila === 0 || index === peliculas.length - 1) {
            peliculasHTML += '</div>';
        }
    });

    return peliculasHTML;
}

function generatePaginationHTML(baseUrl, totalPages, currentPage) {
    if (totalPages === 1 || totalPages === 0) {
        return '<ul class="tsc_pagination tsc_paginationA tsc_paginationA06"></ul >'
    }

    const maxVisiblePages = 8;
    const ellipsisThreshold = 3;
    const prevLabel = '« Previous';
    const nextLabel = 'Next »';

    let paginationHTML = '<ul class="tsc_pagination tsc_paginationA tsc_paginationA06">';

    const getPageUrl = (page) => {
        return page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    };

    if (currentPage === 1) {
        paginationHTML += '<li class="unavailable">' + prevLabel + '</li>';
    } else {
        paginationHTML += '<li><a href="' + getPageUrl(currentPage - 1) + '">' + prevLabel + '</a></li>';
    }

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += '<li><a href="javascript:void(0)" class="current">' + i + '</a></li>';
            } else {
                paginationHTML += '<li><a href="' + getPageUrl(i) + '">' + i + '</a></li>';
            }
        }
    } else {
        let startIndex = 1;
        let endIndex = maxVisiblePages;

        if (currentPage > ellipsisThreshold + 1) {
            paginationHTML += '<li><a href="' + getPageUrl(1) + '">...</a></li>';
            startIndex = currentPage - ellipsisThreshold;
            endIndex = currentPage + ellipsisThreshold;
        }

        if (currentPage > totalPages - ellipsisThreshold) {
            startIndex = totalPages - maxVisiblePages + 1;
            endIndex = totalPages;
        }

        for (let i = startIndex; i <= endIndex; i++) {
            if (i === currentPage) {
                paginationHTML += '<li><a href="javascript:void(0)" class="current">' + i + '</a></li>';
            } else {
                paginationHTML += '<li><a href="' + getPageUrl(i) + '">' + i + '</a></li>';
            }
        }

        if (currentPage < totalPages - ellipsisThreshold) {
            paginationHTML += '<li><a href="' + getPageUrl(totalPages) + '">...</a></li>';
        }
    }

    if (currentPage === totalPages) {
        paginationHTML += '<li class="unavailable">' + nextLabel + '</li>';
    } else {
        paginationHTML += '<li><a href="' + getPageUrl(currentPage + 1) + '">' + nextLabel + '</a></li>';
    }

    paginationHTML += '</ul>';

    return paginationHTML;
}


module.exports = {
    generarHTMLPeliculas,
    generatePaginationHTML
};
