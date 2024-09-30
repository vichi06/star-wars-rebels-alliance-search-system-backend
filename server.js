require("dotenv").config();

// Importation des modules
const Hapi = require("@hapi/hapi");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

function cleanAndParseJson(jsonString) {
  // Replace unquoted string values with quoted ones
  // This regex finds values that are unquoted strings
  jsonString = jsonString.replace(/:\s*([a-zA-Z_]\w*)/g, ': "$1"');

  // Optional: Handle specific known invalid values
  jsonString = jsonString.replace(
    /"akrcwohoahoohuc":\s*"[^"]*"/,
    '"akrcwohoahoohuc": null'
  );

  // Now parse the cleaned JSON string
  try {
    const jsonObject = JSON.parse(jsonString);
    return jsonObject;
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return null;
  }
}

// Sample function to sign a JWT
const createToken = (user) => {
  return jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
};

// Fonction asynchrone pour démarrer le serveur
const init = async () => {
  // Configuration du serveur
  const server = Hapi.server({
    port: 3001,
    host: "localhost",
  });

  // Register JWT authentication strategy
  await server.register(require("hapi-auth-jwt2"));

  server.auth.strategy("jwt", "jwt", {
    key: JWT_SECRET, // Secret key for JWT
    validate: (decoded, request, h) => {
      // Add custom validation logic if needed
      return { isValid: true };
    },
    verifyOptions: { algorithms: ["HS256"] },
  });

  server.auth.default("jwt"); // Require JWT by default for all routes except for login

  // Login Route (No authentication required here)
  server.route({
    method: "POST",
    path: "/login",
    options: {
      auth: false,
      cors: {
        origin: ["*"], // You can specify specific origins instead of '*'
      },
    },
    handler: (request, h) => {
      const { username, password } = request.payload;
      try {
        if (username === USERNAME && password === PASSWORD) {
          const token = createToken({ username });
          return { token };
        }
      } catch (error) {
        console.log(error);
      }

      return h.response({ error: "Invalid username or password" }).code(401);
    },
  });

  // Route pour rechercher des données sur SWAPI avec authentification
  server.route({
    method: "GET",
    path: "/search",
    options: {
      auth: "jwt", // This route requires JWT authentication
      cors: {
        origin: ["*"], // You can specify specific origins instead of '*'
      },
    },
    handler: async (request, h) => {
      // Récupération des paramètres de la requête
      const { type, query, format } = request.query;

      // Vérification si les paramètres sont fournis
      if (!type || !query) {
        return h
          .response({ error: 'Les paramètres "type" et "query" sont requis.' })
          .code(400);
      }

      // Construction de l'URL vers l'API SWAPI
      let apiUrl = `https://swapi.dev/api/${type}/?search=${query}`;

      if (format === "wookiee") apiUrl += "&format=wookiee";

      try {
        // Appel à SWAPI avec axios
        const response = await axios.get(apiUrl);
        let data = response.data;

        if (format === "wookiee") data = cleanAndParseJson(data);

        // Retourner les données reçues de SWAPI
        return h.response(data).code(200);
      } catch (error) {
        // Gérer les erreurs de requêtes vers SWAPI
        return h
          .response({
            error: "Erreur lors de la récupération des données de SWAPI.",
          })
          .code(500);
      }
    },
  });

  // Route pour rechercher des détails sur un élément sur SWAPI avec authentification
  server.route({
    method: "GET",
    path: "/details",
    options: {
      auth: "jwt", // This route requires JWT authentication
      cors: {
        origin: ["*"], // You can specify specific origins instead of '*'
      },
    },
    handler: async (request, h) => {
      // Récupération des paramètres de la requête
      const { type, id, format } = request.query;

      // Vérification si les paramètres sont fournis
      if (!type || !id) {
        return h
          .response({ error: 'Les paramètres "type" et "id" sont requis.' })
          .code(400);
      }

      // Construction de l'URL vers l'API SWAPI
      let apiUrl = `https://swapi.dev/api/${type}/${id}/`;

      if (format === "wookiee") apiUrl += "?format=wookiee";

      try {
        // Appel à SWAPI avec axios
        const response = await axios.get(apiUrl);
        const data = response.data;

        // Retourner les données reçues de SWAPI
        return h.response(data).code(200);
      } catch (error) {
        // Gérer les erreurs de requêtes vers SWAPI
        return h
          .response({
            error: "Erreur lors de la récupération des données de SWAPI.",
          })
          .code(500);
      }
    },
  });

  // Démarrer le serveur
  await server.start();
  console.log("Serveur Hapi démarré sur %s", server.info.uri);
};

// Gestion des erreurs globales
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

// Lancer le serveur
init();
