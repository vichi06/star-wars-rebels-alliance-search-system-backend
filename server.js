// Importation des modules
const Hapi = require("@hapi/hapi");
const axios = require("axios");
const Basic = require("@hapi/basic");

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

// Fonction de validation pour l'authentification
const validate = async (request, username, password, h) => {
  // Vérifier si le nom d'utilisateur est "Luke" et le mot de passe "DadSucks"
  if (username === "Luke" && password === "DadSucks") {
    // Si les informations sont correctes, on retourne les détails de l'utilisateur
    return { isValid: true, credentials: { user: username } };
  } else {
    // Sinon, l'authentification échoue
    return { isValid: false };
  }
};

// Fonction asynchrone pour démarrer le serveur
const init = async () => {
  // Configuration du serveur
  const server = Hapi.server({
    port: 3001,
    host: "localhost",
  });

  // Enregistrement du plugin d'authentification de base
  await server.register(Basic);

  // Définir une stratégie d'authentification avec le schéma 'basic'
  server.auth.strategy("simple", "basic", { validate });

  // Appliquer cette stratégie comme méthode d'authentification par défaut
  server.auth.default("simple");

  // Route pour rechercher des données sur SWAPI avec authentification
  server.route({
    method: "GET",
    path: "/search",
    options: {
      auth: "simple", // Cette route nécessite une authentification
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
      auth: "simple", // Cette route nécessite une authentification
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
