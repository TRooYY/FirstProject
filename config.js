module.exports = {
	bundles: {
		clientJavaScript: {
			main: {
				file: '/js.min/app.min.js',
				location: 'head',
				contents: [
					'/js/contact.js',
					'/js/cart.js',
				]
			}
		},
		clientCss: {
			main: {
				file: '/css/app.min.css',
				contents: [
					'/css/main.css',
					'/css/cart.css',
				]
			}
		},
	},
}
