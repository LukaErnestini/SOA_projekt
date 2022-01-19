"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const { ForbiddenError } = require("moleculer-web").Errors;

const _ = require("lodash");
const slug = require("slug");
const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

module.exports = {
	name: "boat",
	mixins: [DbService("articles")],

	/**
	 * Default settings
	 */
	settings: {
		rest: "boats/",

		fields: [
			"_id",
			"make",
			"model",
			"year",
			"color",
			"hasTrailer",
			"createdAt",
			"updatedAt",
			"registrationNumber",
			"ownerID",
			"type",
		],

		// Validation schema for new entities
		entityValidator: {
			make: { type: "string", min: 2 },
			model: { type: "string", min: 4 },
			year: { type: "number", min: 1970, integer: true },
			color: { optional: true },
			hasTrailer: { type: "boolean", optional: true },
			registrationNumber: { type: "string", min: 5, optional: true },
		},
	},

	/**
	 * Actions
	 */
	actions: {},

	/**
	 * Methods
	 */
	methods: {},
};
