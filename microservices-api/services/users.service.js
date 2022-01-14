const { MoleculerClientError } = require("moleculer").Errors;

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const DbService = require("../mixins/db.mixin");
//const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

module.exports = {
	name: "users",
	mixins: [DbService("users")],

	/**
	 * Default settings
	 */
	settings: {
		/** Secret for JWT */
		JWT_SECRET: process.env.JWT_SECRET || "jwt-secret",

		/** Public fields */
		fields: ["_id", "firstname", "lastname", "email", "bio", "image"],

		/** Validator schema for entity */
		entityValidator: {
			firstname: { type: "string" },
			lastname: { type: "string" },
			email: { type: "email" },
			password: { type: "string", min: 6 },
			bio: { type: "string", optional: true },
			image: { type: "string", optional: true },
		},
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Register a new user
		 *
		 * @actions
		 * @param {Object} user - User entity
		 *
		 * @returns {Object} Created entity & token
		 */
		create: {
			params: {
				user: { type: "object" },
			},
			async handler(ctx) {
				let entity = ctx.params.user;
				await this.validateEntity(entity);
				if (entity.email) {
					const found = await this.adapter.findOne({
						email: entity.email,
					});
					if (found)
						return Promise.reject(
							new MoleculerClientError(
								"Email exists!",
								422,
								"Email exists!",
								[{ field: "email", message: "Email exists" }]
							)
						);
				}
				entity.password = bcrypt.hashSync(entity.password, 10);
				entity.bio = entity.bio || "";
				entity.image = entity.image || null;
				entity.createdAt = new Date();

				const doc = await this.adapter.insert(entity);
				const user = await this.transformDocuments(ctx, {}, doc);
				return this.entityChanged("created", user, ctx).then(
					() => user
				);
			},
		},

		/**
		 * Login with username & password
		 *
		 * @actions
		 * @param {Object} user - User credentials
		 *
		 * @returns {Object} Logged in user with token
		 */
		login: {
			rest: "POST /users/login",
			params: {
				user: {
					type: "object",
					props: {
						email: { type: "email" },
						password: { type: "string", min: 1 },
					},
				},
			},
			async handler(ctx) {
				const { email, password } = ctx.params.user;

				const user = await this.adapter.findOne({ email });
				if (!user)
					throw new MoleculerClientError(
						"Email or password is invalid!",
						422,
						"",
						[{ field: "email", message: "is not found" }]
					);

				const res = await bcrypt.compare(password, user.password);
				if (!res)
					throw new MoleculerClientError("Wrong password!", 422, "", [
						{ field: "email", message: "is not found" },
					]);

				// Transform user entity (remove password and all protected fields)
				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			},
		},

		/**
		 * Get user by JWT token (for API GW authentication)
		 *
		 * @actions
		 * @param {String} token - JWT token
		 *
		 * @returns {Object} Resolved user
		 */
		resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60, // 1 hour
			},
			params: {
				token: "string",
			},
			async handler(ctx) {
				const decoded = await new this.Promise((resolve, reject) => {
					jwt.verify(
						ctx.params.token,
						this.settings.JWT_SECRET,
						(err, decoded) => {
							if (err) return reject(err);

							resolve(decoded);
						}
					);
				});

				if (decoded.id) return this.getById(decoded.id);
			},
		},

		/**
		 * Get current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @returns {Object} User entity
		 */
		me: {
			auth: "required",
			rest: "GET /user",
			cache: {
				keys: ["#userID"],
			},
			async handler(ctx) {
				const user = await this.getById(ctx.meta.userID);
				if (!user)
					throw new MoleculerClientError("User not found!", 400);

				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			},
		},

		/**
		 * Update current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @param {Object} user - Modified fields
		 * @returns {Object} User entity
		 */
		updateMyself: {
			auth: "required",
			rest: "PUT /user",
			params: {
				user: {
					type: "object",
					props: {
						firstname: { type: "string", min: 2, optional: true },
						lastname: { type: "string", min: 2, optional: true },
						password: { type: "string", min: 6, optional: true },
						email: { type: "email", optional: true },
						bio: { type: "string", optional: true },
						image: { type: "string", optional: true },
					},
				},
			},
			async handler(ctx) {
				const newData = ctx.params.user;
				if (newData.email) {
					const found = await this.adapter.findOne({
						email: newData.email,
					});
					if (
						found &&
						found._id.toString() !== ctx.meta.userID.toString()
					)
						throw new MoleculerClientError(
							"Email is exist!",
							422,
							"",
							[{ field: "email", message: "is exist" }]
						);
				}
				newData.updatedAt = new Date();
				const update = {
					$set: newData,
				};
				const doc = await this.adapter.updateById(
					ctx.meta.userID,
					update
				);

				const user = await this.transformDocuments(ctx, {}, doc);
				const json = await this.transformEntity(
					user,
					true,
					ctx.meta.token
				);
				await this.entityChanged("updated", json, ctx);
				return json;
			},
		},

		/**
		 * Get a user profile.
		 *
		 * @actions
		 *
		 * @param {String} username - Username
		 * @returns {Object} User entity
		 */
		profile: {
			cache: {
				keys: ["#userID", "email"],
			},
			rest: "GET /profiles/:id",
			params: {
				id: { type: "string" },
			},
			async handler(ctx) {
				const user = await this.adapter.findOne({
					_id: ctx.params.id,
				});
				if (!user)
					throw new MoleculerClientError("User not found!", 404);

				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformProfile(ctx, doc, ctx.meta.user);
			},
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Generate a JWT token from user entity
		 *
		 * @param {Object} user
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign(
				{
					id: user._id,
					username: user.username,
					exp: Math.floor(exp.getTime() / 1000),
				},
				this.settings.JWT_SECRET
			);
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 *
		 * @param {Object} user
		 * @param {Boolean} withToken
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=robohash";
				user.image = user.image || "";
				if (withToken) user.token = token || this.generateJWT(user);
			}

			return { user };
		},

		/**
		 * Transform returned user entity as profile.
		 *
		 * @param {Context} ctx
		 * @param {Object} user
		 * @param {Object?} loggedInUser
		 */
		async transformProfile(ctx, user, loggedInUser) {
			//user.image = user.image || "https://www.gravatar.com/avatar/" + crypto.createHash("md5").update(user.email).digest("hex") + "?d=robohash";
			user.image =
				user.image ||
				"https://static.productionready.io/images/smiley-cyrus.jpg";

			if (loggedInUser) {
				const res = await ctx.call("follows.has", {
					user: loggedInUser._id.toString(),
					follow: user._id.toString(),
				});
				user.following = res;
			} else {
				user.following = false;
			}

			return { profile: user };
		},
	},
};
