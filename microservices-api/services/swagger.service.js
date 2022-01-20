const SwaggerService = require("moleculer-web-swagger");

module.exports = {
	mixins: [SwaggerService],
	settings: {
		middleware: false,
		port: 3005,
		ip: "0.0.0.0",
		expose: true,
		swagger: {
			info: {
				description: "SOA1 Swagger",
				version: "4.2.0",
				title: "SOA1",
				termsOfService: "",
				contact: {
					name: "Luka Ernestini",
					url: "https://github.com/LukaErnestini/SOA_projekt",
					email: "luka.ernestini@gmail.com",
				},
				license: {
					name: "Apache 2.0",
					url: "https://www.apache.org/licenses/LICENSE-2.0.html",
				},
			},
			host: "soa1.43solutions.top:3002",
			basePath: "/v1",
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
					},
				},
			},
			tags: [
				{
					name: "microservice user",
				},
				{
					name: "microservice boat",
				},
			],
			schemes: ["http", "https"],
			consumes: ["application/json", "application/xml"],
			produces: ["application/xml", "application/json"],
		},

		routes: [
			// your moleculer-web routes
			// you can impoert from your moleculer-web service
			{
				path: "/api",
				aliases: {
					// Admin login
					"GET /greeter/hello": {
						swaggerDoc: {
							tags: ["greeter"],
							description: "Hello Page",
							parameters: [],
						},
						action: "greeter.hello",
					},
					"GET /greeter/welcome": {
						swaggerDoc: {
							tags: ["greeter"],
							description: "Welcome Page",
							parameters: [
								{
									in: "query",
									name: "name",
									type: "string",
									description: "",
									required: true,
									schema: {
										name: {
											type: "string",
										},
									},
								},
							],
						},
						action: "greeter.welcome",
					},
				},
			},
		],
	},
};
