"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const { ForbiddenError } = require("moleculer-web").Errors;

const _ = require("lodash");
const DbService = require("../mixins/db.mixin");

module.exports = {
	name: "boat",
	mixins: [DbService("boats")],

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
			color: { type: "string", optional: true },
			hasTrailer: { type: "boolean", optional: true },
			registrationNumber: { type: "string", min: 5, optional: true },
		},
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Create a new boat.
		 * Auth is required!
		 *
		 * @actions
		 * @param {Object} boat - Boat entity
		 *
		 * @returns {Object} Created entity
		 */
		create: {
			auth: "required",
			rest: "POST /",
			params: {
				boat: { type: "object" },
			},
			async handler(ctx) {
				let entity = ctx.params.boat;
				await this.validateEntity(entity);

				entity.ownerID = ctx.meta.userId;
				entity.createdAt = new Date();
				entity.updatedAt = new Date();

				const doc = await this.adapter.insert(entity);
				let boat = await this.transformDocuments(ctx, {}, doc);
				await this.entityChanged("created", boat, ctx);
				return boat;
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {},
};
