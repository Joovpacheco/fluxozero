export default async function handler(req, res) {

  try {

    let query = "";

    req.on("data", chunk => {
      query += chunk;
    });

    req.on("end", async () => {

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain"
          },
          body: query
        }
      );

      const data = await response.json();

      res.status(200).json(data);

    });

  } catch (e) {

    console.log(e);

    res.status(500).json({
      erro: "Erro Overpass"
    });

  }

}