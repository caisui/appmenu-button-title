FILES=makefile bootstrap.js install.rdf

xpi:
	7z u -tzip appmenu-button-title.xpi -xr!*.swp $(FILES)

