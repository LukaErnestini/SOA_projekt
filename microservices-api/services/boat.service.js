"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const { ForbiddenError } = require("moleculer-web").Errors;

//const _ = require("lodash");
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

				entity.ownerID = ctx.meta.userID;
				entity.createdAt = new Date();
				entity.updatedAt = new Date();

				const doc = await this.adapter.insert(entity);
				let boat = await this.transformDocuments(ctx, {}, doc);
				await this.entityChanged("created", boat, ctx);
				return boat;
			},
		},

		/**
		 * Update a boat.
		 * Auth is required!
		 *
		 * @actions
		 * @param {String} id - Boat ID
		 * @param {Object} boat - Boat modified fields
		 *
		 * @returns {Object} Updated entity
		 */
		update: {
			auth: "required",
			rest: "PUT /:id",
			params: {
				id: { type: "string" },
				boat: {
					type: "object",
					props: {
						make: { type: "string", min: 2 },
						model: { type: "string", min: 4 },
						year: { type: "number", min: 1970, integer: true },
						color: { type: "string", optional: true },
						hasTrailer: { type: "boolean", optional: true },
						registrationNumber: {
							type: "string",
							min: 5,
							optional: true,
						},
					},
				},
			},
			async handler(ctx) {
				let newData = ctx.params.boat;
				newData.updatedAt = new Date();

				const boat = await this.findOne({
					_id: ctx.params.id,
				});
				if (!boat)
					throw new MoleculerClientError("Boat not found", 404);

				if (boat.ownerID !== ctx.meta.userId)
					throw new ForbiddenError();

				const update = {
					$set: newData,
				};

				const doc = await this.adapter.updateById(
					ctx.params.id,
					update
				);
				const json = await this.transformDocuments(ctx, {}, doc);
				this.entityChanged("updated", json, ctx);
				return json;
			},
		},

		/**
		 * List all boats
		 * Auth is required!
		 * Admin only
		 * @actions
		 *
		 */
		list: {
			auth: "required",
			rest: "GET /",
			async handler(ctx) {
				await ctx.call("users.checkAdmin", {
					isAdmin: ctx.meta.isAdmin,
				});
				const doc = await this.adapter.find({});
				const json = await this.transformDocuments(ctx, {}, doc);
				return json;
			},
		},

		/**
		 * List all boats of user
		 * Auth is required!
		 * @actions
		 *
		 */
		userBoats: {
			auth: "required",
			rest: "GET /mine",
			async handler(ctx) {
				// TODO ERROR: find() query not working !! only with findOne it works, otherwise ignored
				const doc = await this.adapter.find({
					ownerID: ctx.meta.userID,
				});
				// this.logger.info("doc: ", doc);
				// this.logger.info("doc: ", ctx.meta.userID);

				// get rid of boats without owners
				let filtered = doc.filter((el) => {
					return el.ownerID !== null;
				});

				filtered = filtered.filter((el) => {
					return (
						el.ownerID.toString().trim() ==
						ctx.meta.userID.toString().trim()
					);
				});

				const json = await this.transformDocuments(ctx, {}, filtered);
				return json;
			},
		},

		/**
		 * delete owned boat by id
		 * Auth is required!
		 * @actions
		 * @param {String} id - Boat ID
		 *
		 */
		removeMyBoat: {
			auth: "required",
			rest: "DELETE /:id",
			params: {
				id: { type: "any" },
			},
			async handler(ctx) {
				const res = await this.adapter.removeById(ctx.params.id);
				await this.entityChanged("removed", res, ctx);
			},
		},

		/**
		 * List boats of user
		 * Auth is required!
		 * Admin only
		 * @actions
		 * @param {String} id - User ID
		 *
		 */
		boatsOfUser: {
			auth: "required",
			rest: "GET /user/:id",
			async handler(ctx) {
				// check if user is admin
				await ctx.call("users.checkAdmin", {
					isAdmin: ctx.meta.isAdmin,
				});
				// TODO ERROR: find() query not working !! only with findOne it works, otherwise ignored
				const doc = await this.adapter.find({
					ownerID: ctx.params.id,
				});
				// this.logger.info("doc: ", doc);
				// this.logger.info("doc: ", ctx.meta.userID);

				// get rid of boats without owners
				let filtered = doc.filter((el) => {
					return el.ownerID !== null;
				});

				filtered = filtered.filter((el) => {
					return (
						el.ownerID.toString().trim() ==
						ctx.params.id.toString().trim()
					);
				});

				const json = await this.transformDocuments(ctx, {}, filtered);
				return json;
			},
		},

		/**
		 * delete user's boats
		 * Auth is required!
		 * Admin only
		 * @actions
		 * @param {String} id - user ID
		 *
		 */
		removeUserBoats: {
			auth: "required",
			rest: "DELETE /user/:id",
			params: {
				id: { type: "any" },
			},
			async handler(ctx) {
				// check if user is admin
				await ctx.call("users.checkAdmin", {
					isAdmin: ctx.meta.isAdmin,
				});
				// TODO fix does not work.
				const res = await this.adapter.removeMany({
					ownerID: ctx.params.id,
				});
				await this.entityChanged("removed", res, ctx);
			},
		},

		/**
		 * Toggle trailer of boat
		 * Auth is required!
		 * @actions
		 * @param {String} id - user ID
		 *
		 */
		toggleTrailer: {
			auth: "required",
			rest: "PUT /toggleTrailer/:id",
			params: {
				id: { type: "any" },
			},
			async handler(ctx) {
				const doc = await this.adapter.findById(ctx.params.id);

				if (doc.hasTrailer)
					await this.adapter.updateById(ctx.params.id, {
						$set: {
							hasTrailer: false,
						},
					});
				else
					await this.adapter.updateById(ctx.params.id, {
						$set: {
							hasTrailer: true,
						},
					});

				const res = await this.adapter.findById(ctx.params.id);
				return res;
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {},
};
