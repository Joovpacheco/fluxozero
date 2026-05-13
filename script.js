const supabaseUrl =
  "https://whbmojydgmimrobaoitt.supabase.co";

const supabaseKey =
  "sb_publishable_J5diF1zotwMD6d00NBEn8w_0MSNlc7q";

const db =
  window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );
// 🔥 VARIÁVEIS GLOBAIS
let produtosTemp = [];
let marcadores = [];
let marcadorUsuario = null;
let marcadorCadastro = null;
let postos = [];
let linhaRota = null;

let precoGasolina =
  parseFloat(localStorage.getItem("precoGasolina")) || 5.5;
let usuarios =
  JSON.parse(localStorage.getItem("usuarios")) || [];
let usuarioLogado =
  JSON.parse(localStorage.getItem("usuarioLogado")) || null;
let usuarioLat = null;
let usuarioLng = null;
// 🗺️ MAPA
let mapa;
// 🏆 ÍCONE MELHOR
let iconeMelhor = null;

document.addEventListener(
  "DOMContentLoaded",
  () => {
    iconeMelhor = L.icon({
      iconUrl:
        "https://cdn-icons-png.flaticon.com/512/190/190411.png",
      iconSize: [35,35]
    });
  }
);
// 🏪 DADOS
let estabelecimentos = [];
async function carregarDados() {

  let { data, error } =
    await db
      .from("estabelecimentos")
      .select("*");

  if(error){
    console.log(error);
    return;
  }

  estabelecimentos = data || [];
}
// 🔄 TROCAR TELA
function trocarTela(id, el) {
    let secoes = [
       "loginSection",
       "buscaSection",
       "mapaSection",
       "areaCadastro",
       "gerenciarSection",
       "perfilSection"
    ];
    // esconde todas
    secoes.forEach(sec => {
        let secEl = document.getElementById(sec);
        if (secEl) {
            secEl.style.display = "none";
        }
    });
    // 🔐 bloqueia cadastro sem login
    if (
        id === "areaCadastro" &&
        !usuarioLogado
    ) {
        alert("Faça login primeiro!");
        return;
    }
    // mostra tela
    let tela = document.getElementById(id);
    if (tela) {
        tela.style.display = "block";
    }
    // botão ativo
    document
        .querySelectorAll(".nav button")
        .forEach(btn =>
            btn.classList.remove("active")
        );
    if (el) {
        el.classList.add("active");
    }
    // 🗺️ MAPA
    if (id === "mapaSection") {
        setTimeout(() => {
            // cria mapa uma única vez
            if (!mapa) {
                mapa = L.map("mapa").setView(
                    [-15.79, -47.88],
                    12
                );
                L.tileLayer(
                    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    {
                        attribution:
                            "&copy; OpenStreetMap"
                    }
                ).addTo(mapa);
                // 🔥 CLICK NO MAPA
                mapa.on("click", function (e) {
                    let lat = e.latlng.lat;
                    let lng = e.latlng.lng;
                    let latInput =
                        document.getElementById("lat");
                    let lngInput =
                        document.getElementById("lng");
                    if (latInput) {
                        latInput.value =
                            lat.toFixed(6);
                    }
                    if (lngInput) {
                        lngInput.value =
                            lng.toFixed(6);
                    }
                    // remove marcador antigo
                    if (marcadorCadastro) {
                        mapa.removeLayer(
                            marcadorCadastro
                        );
                    }
                    // novo marcador
                    marcadorCadastro = L.marker([
                        lat,
                        lng
                    ])
                        .addTo(mapa)
                        .bindPopup(
                            "📍 Local selecionado"
                        )
                        .openPopup();
                });
            }
            // 🔥 força render
            mapa.invalidateSize();
        }, 300);
    }
}
// 📏 DISTÂNCIA
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat =
    (lat2 - lat1) * Math.PI / 180;
  const dLng =
    (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * (
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}
// 📍 LOCALIZAÇÃO
function iniciarLocalizacao(){
  if(!navigator.geolocation){
    alert(
      "Geolocalização não suportada"
    );
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      usuarioLat =
        pos.coords.latitude;
      usuarioLng =
        pos.coords.longitude;
      console.log(
        "LOCALIZAÇÃO:",
        usuarioLat,
        usuarioLng
      );
      if(marcadorUsuario){
        mapa.removeLayer(
          marcadorUsuario
        );
      }
      marcadorUsuario =
        L.marker([
          usuarioLat,
          usuarioLng
        ])
        .addTo(mapa)
        .bindPopup("📍 Você");
      mapa.setView(
        [usuarioLat, usuarioLng],
        15
      );
      alert(
        "📍 Localização ativada!"
      );
    },
    erro => {
      console.log(erro);
      alert(
        "❌ Permita localização no navegador"
      );
    },
    {
      enableHighAccuracy:true,
      timeout:15000,
      maximumAge:0
    }
  );
}
function toggleMenuUsuario() {
  let d =
    document.getElementById(
      "dropdownUsuario"
    );
  d.style.display =
    d.style.display === "block"
      ? "none"
      : "block";
}
// 🔎 BUSCAR
function buscar() {
if(!usuarioLat || !usuarioLng){
  alert(
    "Ative sua localização primeiro"
  );
  return;
}
  let termo =
    document
      .getElementById("busca")
      .value
      .toLowerCase()
      .trim();
  let filtroTipo =
    document.getElementById(
      "filtroTipo"
    ).value;
  let resultadosDiv =
    document.getElementById(
      "resultados"
    );
  resultadosDiv.innerHTML = "";
  if (!usuarioLat || !usuarioLng) {
    alert(
      "Ative sua localização primeiro"
    );
    return;
  }
  let resultados = [];
  estabelecimentos.forEach(est => {
    // 🔥 distância máxima 5km
    let distancia =
      calcularDistancia(
        usuarioLat,
        usuarioLng,
        est.lat,
        est.lng
      );
    if (distancia > 5) {
      return;
    }
    // 🔥 filtro tipo
    if (
      filtroTipo &&
      est.tipo !== filtroTipo
    ) {
      return;
    }
    // 🔥 sem termo → busca só pelo tipo
    if (!termo) {
      resultados.push({
        produto: "Sem produto específico",
        preco: "-",
        estabelecimento: est.nome,
        distancia,
        lat: est.lat,
        lng: est.lng,
        tipo: est.tipo
      });
      return;
    }
    // 🔥 busca por nome estabelecimento
    if (
      est.nome
        .toLowerCase()
        .includes(termo)
    ) {
      resultados.push({
        produto: "Estabelecimento",
        preco: "-",
        estabelecimento: est.nome,
        distancia,
        lat: est.lat,
        lng: est.lng,
        tipo: est.tipo
      });
    }
    // 🔥 busca produtos
    (est.produtos || []).forEach(prod => {
      if (
        prod.nome
          .toLowerCase()
          .includes(termo)
      ) {
        resultados.push({
          produto: prod.nome,
          preco: prod.preco,
          estabelecimento: est.nome,
          distancia,
          lat: est.lat,
          lng: est.lng,
          tipo: est.tipo
        });
      }
    });
  });
  // 🔥 ordena por distância
  resultados.sort(
    (a, b) =>
      a.distancia - b.distancia
  );
  // 🔥 sem resultados
  if (resultados.length === 0) {
    resultadosDiv.innerHTML = `
      <div class="card">
        Nenhum resultado encontrado em até 5km.
      </div>
    `;
    mostrarNoMapa([]);
    return;
  }
  // 🔥 render lista
  resultados.forEach((r, i) => {
    resultadosDiv.innerHTML += `
      <div class="card">
        <strong>
          ${r.estabelecimento}
        </strong>
        ${
          i === 0
            ? "<span style='color:#22c55e'> 🔥 Mais próximo</span>"
            : ""
        }
        <br><br>
        🏪 ${r.tipo}<br>

        📦 ${r.produto}<br>

        💰 ${
          r.preco === "-"
            ? "-"
            : "R$ " + r.preco
        }<br>
        📍 ${r.distancia.toFixed(2)} km
      </div>
    `;
  });
  mostrarNoMapa(resultados);
}
// 🗺️ MOSTRAR NO MAPA
function mostrarNoMapa(lista) {
  if(!mapa) return;
  marcadores.forEach(m => {
    mapa.removeLayer(m);
  });
  marcadores = [];
  lista.forEach((item, index) => {
    let marcador = L.marker(
      [item.lat, item.lng],
      {
        icon:
          index === 0
            ? iconeMelhor
            : undefined
      }
    ).addTo(mapa);
    marcador.bindPopup(`
      <b>${item.produto}</b><br>
      🏪 ${item.estabelecimento}<br>
      💰 R$ ${item.preco}
    `);
    marcador.on("mouseover", () => {
      marcador.openPopup();
    });
    marcadores.push(marcador);
  });
}
// ⛽ POSTOS
async function buscarPostos() {

  if(!usuarioLat || !usuarioLng){
    alert("Ative sua localização primeiro");
    return;
  }

  if(!mapa){
    alert("Mapa não carregado");
    return;
  }

  try {

    let centro = mapa.getCenter();

    let query = `
      [out:json];
      node["amenity"="fuel"]
      (around:5000,${centro.lat},${centro.lng});
      out;
    `;

    let res = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: query
      }
    );

    if(!res.ok){
      throw new Error("Erro Overpass");
    }

    let data = await res.json();

    postos = [];

    data.elements.forEach(el => {

      if(!el.lat || !el.lon) return;

      let marker = L.marker([
        el.lat,
        el.lon
      ])
      .addTo(mapa)
      .bindPopup(`
        ⛽ <b>${el.tags?.name || "Posto"}</b>
      `);

      marcadores.push(marker);

      postos.push({
        nome:
          el.tags?.name || "Posto",
        lat: el.lat,
        lng: el.lon,
        preco: precoGasolina
      });

    });

    alert(
      `⛽ ${postos.length} postos encontrados`
    );

  } catch(e){

    console.log(e);

    alert(
      "Erro ao buscar postos"
    );

  }
}
// 🧠 MELHOR COMBO
function calcularMelhorCombo(produto) {
  if (!usuarioLat || postos.length === 0) {
    return null;
  }
  let melhor = null;
  estabelecimentos.forEach(est => {
    (est.produtos || []).forEach(prod => {
      if (
        !prod.nome
          .toLowerCase()
          .includes(produto.toLowerCase())
      ) return;
      postos.forEach(posto => {
        let d1 = calcularDistancia(
          usuarioLat,
          usuarioLng,
          posto.lat,
          posto.lng
        );
        let d2 = calcularDistancia(
          posto.lat,
          posto.lng,
          est.lat,
          est.lng
        );
        let d3 = calcularDistancia(
          est.lat,
          est.lng,
          usuarioLat,
          usuarioLng
        );
        let dist = d1 + d2 + d3;
        let custo =
          prod.preco +
          (dist / 10) * posto.preco;
        if (
          !melhor ||
          custo < melhor.custoTotal
        ) {
          melhor = {
            produto: prod.nome,
            mercado: est.nome,
            posto: posto.nome,
            custoTotal: custo,
            lat: est.lat,
            lng: est.lng,
            postoLat: posto.lat,
            postoLng: posto.lng
          };
        }
      });
    });
  });
  return melhor;
}
// 🚀 MELHOR ROTA
// 🚀 MELHOR ROTA
function buscarMelhorCombo() {

  if (!usuarioLat || !usuarioLng) {
    alert("Ative sua localização primeiro!");
    return;
  }

  let termo =
    document
      .getElementById("busca")
      .value
      .toLowerCase()
      .trim();

  let melhor = null;

  estabelecimentos.forEach(est => {

    let distancia =
      calcularDistancia(
        usuarioLat,
        usuarioLng,
        est.lat,
        est.lng
      );

    let nomeCombina =
      est.nome
        .toLowerCase()
        .includes(termo);

    let produtoEncontrado = null;

    if (
      est.produtos &&
      est.produtos.length > 0
    ) {

      produtoEncontrado =
        est.produtos.find(prod =>
          prod.nome
            .toLowerCase()
            .includes(termo)
        );
    }

    if (!termo) {
      nomeCombina = true;
    }

    if (
      !nomeCombina &&
      !produtoEncontrado
    ) {
      return;
    }

    let preco = 0;

    if (
      produtoEncontrado &&
      !isNaN(produtoEncontrado.preco)
    ) {
      preco =
        produtoEncontrado.preco;
    }

    // 🔥 COM POSTOS
    if (postos.length > 0) {

      postos.forEach(posto => {

        let d1 =
          calcularDistancia(
            usuarioLat,
            usuarioLng,
            posto.lat,
            posto.lng
          );

        let d2 =
          calcularDistancia(
            posto.lat,
            posto.lng,
            est.lat,
            est.lng
          );

        let custoGasolina =
          ((d1 + d2) / 10) *
          posto.preco;

        let custoTotal =
          preco + custoGasolina;

        if (
          !melhor ||
          custoTotal < melhor.custoTotal
        ) {

          melhor = {

            produto:
              produtoEncontrado?.nome ||
              "Estabelecimento",

            mercado: est.nome,

            posto: posto.nome,

            custoTotal,

            lat: est.lat,
            lng: est.lng,

            postoLat: posto.lat,
            postoLng: posto.lng
          };
        }
      });

    }

    // 🔥 SEM POSTOS
    else {

      let custoTotal =
        preco + distancia * 0.1;

      if (
        !melhor ||
        custoTotal < melhor.custoTotal
      ) {

        melhor = {

          produto:
            produtoEncontrado?.nome ||
            "Estabelecimento",

          mercado: est.nome,

          custoTotal,

          lat: est.lat,
          lng: est.lng
        };
      }
    }
  });

  if (!melhor) {
    alert("Nada encontrado");
    return;
  }

  marcadores.forEach(m => {
    mapa.removeLayer(m);
  });

  marcadores = [];

  if (linhaRota) {
    mapa.removeLayer(linhaRota);
  }

  let mUser = L.marker([
    usuarioLat,
    usuarioLng
  ])
    .addTo(mapa)
    .bindPopup("📍 Você");

  marcadores.push(mUser);

  let pontos = [
    [usuarioLat, usuarioLng]
  ];

  // 🔥 COM POSTO
  if (melhor.postoLat) {

    let mPosto = L.marker([
      melhor.postoLat,
      melhor.postoLng
    ])
      .addTo(mapa)
      .bindPopup("⛽ Posto");

    marcadores.push(mPosto);

    pontos.push([
      melhor.postoLat,
      melhor.postoLng
    ]);
  }

  // 🏪 DESTINO
  let mMercado = L.marker(
    [melhor.lat, melhor.lng],
    {
      icon: iconeMelhor
    }
  )
    .addTo(mapa)
    .bindPopup(`
      🏪 ${melhor.mercado}
    `);

  marcadores.push(mMercado);

  pontos.push([
    melhor.lat,
    melhor.lng
  ]);

  // 🔥 DESENHA ROTA
  if (melhor.postoLat) {
    desenharRota(pontos, melhor);
  } else {
    desenharRotaDireta(
      pontos,
      melhor
    );
  }
}
// 🛣️ ROTA
async function desenharRota(pontos, r) {
  try {
    let coords = pontos
      .map(p => `${p[1]},${p[0]}`)
      .join(";");
    let res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    let data = await res.json();
    if (
      !data.routes ||
      data.routes.length === 0
    ) {
      alert("Rota não encontrada");
      return;
    }
    let rota = data.routes[0];
    linhaRota = L.polyline(
      rota.geometry.coordinates.map(
        c => [c[1], c[0]]
      ),
      {
        color: "blue",
        weight: 5
      }
    ).addTo(mapa);
    mapa.fitBounds(
      linhaRota.getBounds()
    );
    document.getElementById(
      "resultados"
    ).innerHTML = `
      <div class="card">
        <h2>🏆 Melhor combo</h2>
        <p>
          <strong>${r.produto}</strong>
        </p>
        <p>
          🏪 ${r.mercado}
        </p>
        <p>
          ⛽ ${r.posto}
        </p>
        <h3 class="preco">
          💸 R$ ${r.custoTotal.toFixed(2)}
        </h3>
        <p>
          🛣️ ${(rota.distance / 1000).toFixed(2)} km
        </p>
        <p>
          ⏱️ ${(rota.duration / 60).toFixed(1)} min
        </p>
      </div>
    `;
  } catch (e) {
    alert("Erro ao calcular rota");
  }
}
// 🔐 LOGIN
function login() {
  let user =
    document
      .getElementById("user")
      .value
      .trim();
  let senha =
    document
      .getElementById("senha")
      .value
      .trim();
  let u = usuarios.find(
    u =>
      u.user === user &&
      u.senha === senha
  );
  if (!u) {
    alert("Usuário ou senha incorretos");
    return;
  }
  usuarioLogado = u;
  localStorage.setItem(
    "usuarioLogado",
    JSON.stringify(u)
  );
  atualizarUI();
  trocarTela("buscaSection");
  alert("Logado com sucesso!");
}
// 🔐 LOGOUT
function logout() {
  usuarioLogado = null;
  localStorage.removeItem(
    "usuarioLogado"
  );
  atualizarUI();
  alert("Saiu da conta");
}
// 🔐 UI
function atualizarUI() {
  let btnLogin =
    document.getElementById("btnLogin");
  let menuUsuario =
    document.getElementById("menuUsuario");
  let nomeUsuario =
    document.getElementById("nomeUsuario");
  let avatar =
  document.getElementById(
    "avatarUsuario"
  );
  if (usuarioLogado) {
    btnLogin.style.display = "none";
    menuUsuario.style.display = "block";
    nomeUsuario.innerText =
    usuarioLogado.nome ||
    usuarioLogado.user;
    avatar.src =
      usuarioLogado.foto ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  } else {
    btnLogin.style.display = "block";
    menuUsuario.style.display = "none";
  }
}
// Perfil Usuario
function abrirPerfil() {

  trocarTela("perfilSection");

  document.getElementById(
    "novoNome"
  ).value =
    usuarioLogado.nome || "";

}
function gerenciarEstabelecimentos() {

  trocarTela("gerenciarSection");
let div =
  document.getElementById(
    "listaEstabelecimentos"
  );
  div.innerHTML = "";
  let meus =
    estabelecimentos.filter(
      est =>
        est.dono === usuarioLogado.user
    );
  if (meus.length === 0) {
    div.innerHTML = `
      <div class="card">
        Nenhum estabelecimento cadastrado.
      </div>
    `;
    return;
  }
  meus.forEach(est => {
    let media = 0;
   if(
    est.avaliacoes &&
    est.avaliacoes.length > 0
   ){
        media =
        est.avaliacoes.reduce(
      (acc,a) => acc + a.nota,
      0
       ) / est.avaliacoes.length;

      }
    let produtosHTML = "";
    if (
      est.produtos &&
      est.produtos.length > 0
    ) {
      est.produtos.forEach((p, index) => {
       produtosHTML += `
  <div class="card">
    <h4>${p.nome}</h4>

    <label>💰 Preço</label>
    <input
      type="number"
      value="${p.preco}"
      onchange="
        editarProduto(
          ${est.id},
          ${index},
          'preco',
          this.value
        )
      "
    >

    <label>📦 Quantidade</label>
    <input
      type="number"
      value="${p.quantidade || 0}"
      onchange="
        editarProduto(
          ${est.id},
          ${index},
          'quantidade',
          this.value
        )
      "
    >

    <label>📅 Validade (dias)</label>
    <input
      type="number"
      value="${p.validade || 0}"
      onchange="
        editarProduto(
          ${est.id},
          ${index},
          'validade',
          this.value
        )
      "
    >

    <br><br>

    <button
      onclick="
        removerProduto(
          ${est.id},
          ${index}
        )
      "
    >
      🗑️ Remover produto
    </button>
  </div>
`;
      });
    }
    div.innerHTML += `
      <div class="card">
        <h3>${est.nome}</h3>
        <p>
         🏪 ${est.tipo}
        </p>
        <p>📍 ${est.regiao}</p>
        <p>
           ⭐ Média:
           ${media.toFixed(1)}
          (${est.avaliacoes?.length || 0} avaliações)
        </p>
        <br>
        <button
          onclick="adicionarProdutoGerenciamento(${est.id})"
        >
          ➕ Adicionar produto
        </button>
<button
  onclick="
    avaliarEstabelecimento(${est.id})
  "
>
  ⭐ Avaliar
</button>

<button
  onclick="
    excluirEstabelecimento(${est.id})
  "
>
  🗑️ Excluir estabelecimento
</button>
        <br><br>
        ${produtosHTML}
      </div>
    `;
  });
}
// ⛽ GASOLINA
function definirPrecoGasolina() {
  let novo = prompt(
    "Digite o preço médio da gasolina (ex: 5.79)"
  );
  if (!novo) return;
  novo = parseFloat(
    novo.replace(",", ".")
  );
  if (
    isNaN(novo) ||
    novo <= 0
  ) {
    alert("Valor inválido");
    return;
  }
  precoGasolina = novo;
  localStorage.setItem(
    "precoGasolina",
    novo
  );
  alert(
    `⛽ Novo preço definido: R$ ${novo.toFixed(2)}`
  );
}
function registrarUsuario() {

  let user =
    document
      .getElementById("user")
      .value
      .trim();
  let senha =
    document
      .getElementById("senha")
      .value
      .trim();
  if (!user || !senha) {
    alert("Preencha usuário e senha");
    return;
  }
  let existe = usuarios.find(
    u => u.user === user
  );
  if (existe) {
    alert("Usuário já existe");
    return;
  }
  let novo = {
    user,
    senha,
    nome: user,
    foto: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
  };
  usuarios.push(novo);
  localStorage.setItem(
    "usuarios",
    JSON.stringify(usuarios)
  );
  alert("Conta criada com sucesso!");
}
function previewFoto(event){

  let file =
    event.target.files[0];

  if(!file) return;

  let reader =
    new FileReader();

  reader.onload = function(e){

    document.getElementById(
      "fotoPerfilPreview"
    ).src = e.target.result;

  };

  reader.readAsDataURL(file);

}
// Editar Produto
async function editarProduto(
  estId,
  prodIndex,
  campo,
  valor
){
  let est =
    estabelecimentos.find(
      e => e.id === estId
    );

  if(!est) return;

  est.produtos[prodIndex][campo] =
    campo === "preco"
      ? parseFloat(valor)
      : parseInt(valor);

  await db
    .from("estabelecimentos")
    .update({
      produtos: est.produtos
    })
    .eq("id", est.id);
}
// ➕ ADICIONAR PRODUTO
function adicionarProduto() {
    let nome =
        document.getElementById("nomeProd").value;
    let preco =
        parseFloat(
            document.getElementById("precoProd").value
        );
    let validade =
        parseInt(
            document.getElementById("validadeProd").value
        );
    if (
    nome.trim() === "" ||
    isNaN(preco) ||
    isNaN(validade) )
    {
    alert("Preencha os dados do produto");
        return;
    }
    produtosTemp.push({
        nome,
        preco,
        validade
    });
    atualizarListaProdutos();
    // limpa inputs
    document.getElementById("nomeProd").value = "";
    document.getElementById("precoProd").value = "";
    document.getElementById("validadeProd").value = "";
}
// 📋 ATUALIZAR LISTA
function atualizarListaProdutos() {
    let div =
        document.getElementById("listaProdutos");
    div.innerHTML = "";
    produtosTemp.forEach((p, i) => {
        div.innerHTML += `
            <div class="card">
                <strong>${p.nome}</strong><br>
                💰 R$ ${p.preco}<br>
                📅 ${p.validade} dias
            </div>
        `;
    });
}
// 🗑️ LIMPAR PRODUTOS
function limparProdutos() {
    produtosTemp = [];
    atualizarListaProdutos();
}
// 🏪 CADASTRAR ESTABELECIMENTO
async function cadastrar() {
  let nome =
    document.getElementById("nomeEst").value;
  let regiao =
    document.getElementById("regiaoEst").value;
  let tipo =
    document.getElementById(
       "tipoEst"
    ).value;
  let lat =
    parseFloat(
      document.getElementById("lat").value
    );
  let lng =
    parseFloat(
      document.getElementById("lng").value
    );
  if (
    !nome ||
    !regiao ||
    !tipo ||
    isNaN(lat) ||
    isNaN(lng)
  ) {
    alert("Preencha os dados");
    return;
  }
let novo = {
  dono: usuarioLogado.user,
  nome,
  tipo,
  regiao,
  lat,
  lng,
  produtos: [],
  avaliacoes: []
};
let { error } =
  await db
    .from("estabelecimentos")
    .insert([novo]);
if(error){
  console.log(error);
  alert("Erro ao cadastrar");
  return;
}
await carregarDados();
  alert("🏪 Estabelecimento cadastrado!");
  document.getElementById("nomeEst").value = "";
  document.getElementById("regiaoEst").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
}
//Excluir Estabelecimentos 
async function excluirEstabelecimento(id){
  let { error } =
    await db
      .from("estabelecimentos")
      .delete()
      .eq("id", id);
  if(error){
    alert("Erro ao excluir");
    return;
  }
  await carregarDados();
  gerenciarEstabelecimentos();
}
// ⭐ AVALIAR ESTABELECIMENTO
async function avaliarEstabelecimento(id){
  let est =
    estabelecimentos.find(
      e => e.id === id
    );
  if(!est) return;
  let nota =
    parseInt(
      prompt("Nota de 1 a 5")
    );
  if(
    isNaN(nota) ||
    nota < 1 ||
    nota > 5
  ){
    alert("Nota inválida");
    return;
  }
  let comentario =
    prompt("Comentário");
  if(!est.avaliacoes){
    est.avaliacoes = [];
  }
  est.avaliacoes.push({
    usuario:
      usuarioLogado.user,
    nota,
    comentario
  });
  await db
    .from("estabelecimentos")
    .update({
      avaliacoes:
        est.avaliacoes
    })
    .eq("id", est.id);
  await carregarDados();
  gerenciarEstabelecimentos();
  alert("⭐ Avaliação enviada!");
}
// Produtos
async function abrirProdutos(id) {
  let est =
    estabelecimentos.find(
      e => e.id === id
    );
  if (!est) return;
  let nome =
    prompt("Nome do produto");
  if (!nome) return;
  let preco =
    parseFloat(
      prompt("Preço")
    );
  let quantidade =
    parseInt(
      prompt("Quantidade")
    ) || 0;
  let validade =
    parseInt(
      prompt("Validade em dias")
    ) || 0;
  est.produtos.push({
    nome,
    preco,
    quantidade,
    validade
  });
  await db
    .from("estabelecimentos")
    .update({
      produtos: est.produtos
    })
    .eq("id", est.id);
  await carregarDados();
  alert("Produto adicionado!");
}
// Salvar
function salvarPerfil(){

  let novoNome =
    document.getElementById(
      "novoNome"
    ).value;

  let preview =
    document.getElementById(
      "fotoPerfilPreview"
    ).src;

  if(novoNome){
    usuarioLogado.nome =
      novoNome;
  }

  usuarioLogado.foto =
    preview;

  let index =
    usuarios.findIndex(
      u =>
        u.user ===
        usuarioLogado.user
    );

  usuarios[index] =
    usuarioLogado;

  localStorage.setItem(
    "usuarios",
    JSON.stringify(usuarios)
  );

  localStorage.setItem(
    "usuarioLogado",
    JSON.stringify(usuarioLogado)
  );

  atualizarUI();

  alert("Perfil atualizado!");

}
// ➕ ADICIONAR PRODUTO NO GERENCIAMENTO
async function adicionarProdutoGerenciamento(id){
  let est =
    estabelecimentos.find(
      e => e.id === id
    );
  if(!est) return;
  let nome =
    prompt("Nome do produto");
  if(!nome) return;
  let preco =
    parseFloat(
      prompt("Preço do produto")
    );
  if(isNaN(preco)){
    alert("Preço inválido");
    return;
  }
  let quantidade =
    parseInt(
      prompt("Quantidade")
    ) || 0;
  let validade =
    parseInt(
      prompt("Validade em dias")
    ) || 0;
  est.produtos.push({
    nome,
    preco,
    quantidade,
    validade
  });
  await db
    .from("estabelecimentos")
    .update({
      produtos:
        est.produtos
    })
    .eq("id", est.id);
  await carregarDados();
  gerenciarEstabelecimentos();
  alert("✅ Produto adicionado!");
}
// 🗑️ REMOVER PRODUTO
async function removerProduto(
  estId,
  prodIndex
){
  let est =
    estabelecimentos.find(
      e => e.id === estId
    );
  if(!est) return;
  est.produtos.splice(
    prodIndex,
    1
  );
  await db
    .from("estabelecimentos")
    .update({
      produtos:
        est.produtos
    })
    .eq("id", est.id);
  await carregarDados();
  gerenciarEstabelecimentos();
}
async function salvarProduto(
  estId,
  index
){
  let est =
    estabelecimentos.find(
      e => e.id === estId
    );
  if(!est) return;
  let produto =
    est.produtos[index];
  produto.nome =
    document.getElementById(
      `nome-${estId}-${index}`
    ).value;
  produto.preco =
    parseFloat(
      document.getElementById(
        `preco-${estId}-${index}`
      ).value
    );
  produto.quantidade =
    parseInt(
      document.getElementById(
        `quantidade-${estId}-${index}`
      ).value
    );
  produto.validade =
    parseInt(
      document.getElementById(
        `validade-${estId}-${index}`
      ).value
    );
  await db
    .from("estabelecimentos")
    .update({
      produtos:
        est.produtos
    })
    .eq("id", est.id);
  await carregarDados();
  alert("✅ Produto atualizado");
}
async function importarMercados() {

  if(!usuarioLat || !usuarioLng){
    alert("Ative sua localização primeiro");
    return;
  }

  if(!mapa){
    alert("Abra o mapa primeiro");
    return;
  }

  try {

    let centro = mapa.getCenter();

    let query = `
      [out:json];
      (
        node["shop"="supermarket"]
        (around:5000,${centro.lat},${centro.lng});

        node["shop"="convenience"]
        (around:5000,${centro.lat},${centro.lng});

        node["shop"="bakery"]
        (around:5000,${centro.lat},${centro.lng});

        node["amenity"="restaurant"]
        (around:5000,${centro.lat},${centro.lng});

        node["amenity"="fast_food"]
        (around:5000,${centro.lat},${centro.lng});

        node["amenity"="cafe"]
        (around:5000,${centro.lat},${centro.lng});

        node["shop"="butcher"]
        (around:5000,${centro.lat},${centro.lng});

        node["shop"="greengrocer"]
        (around:5000,${centro.lat},${centro.lng});

        node["amenity"="fuel"]
        (around:5000,${centro.lat},${centro.lng});
      );
      out;
    `;

    let res = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: query
      }
    );

    if(!res.ok){
      throw new Error("Erro Overpass");
    }

    let data = await res.json();

    let novosEstabelecimentos = [];

    for(let el of data.elements){

      if(!el.lat || !el.lon) continue;

      let nome =
        el.tags?.name ||
        "Estabelecimento";

      let lat = el.lat;
      let lng = el.lon;

      let existe =
        estabelecimentos.find(
          e =>
            e.nome === nome &&
            Math.abs(e.lat - lat) < 0.0001 &&
            Math.abs(e.lng - lng) < 0.0001
        );

      if(existe) continue;

      let tipo = "Estabelecimento";

      if(el.tags?.shop === "supermarket"){
        tipo = "Mercado";
      }
      else if(el.tags?.shop === "convenience"){
        tipo = "Conveniência";
      }
      else if(el.tags?.shop === "bakery"){
        tipo = "Padaria";
      }
      else if(el.tags?.amenity === "restaurant"){
        tipo = "Restaurante";
      }
      else if(el.tags?.amenity === "fast_food"){
        tipo = "Lanchonete";
      }
      else if(el.tags?.amenity === "cafe"){
        tipo = "Cafeteria";
      }
      else if(el.tags?.shop === "butcher"){
        tipo = "Açougue";
      }
      else if(el.tags?.shop === "greengrocer"){
        tipo = "Hortifruti";
      }
      else if(el.tags?.amenity === "fuel"){
        tipo = "Posto";
      }

      novosEstabelecimentos.push({
        dono: "IMPORTADO",
        nome,
        tipo,
        regiao: "Importado",
        lat,
        lng,
        produtos: [],
        avaliacoes: []
      });

    }

    if(novosEstabelecimentos.length > 0){

      let { error } =
        await db
          .from("estabelecimentos")
          .insert(novosEstabelecimentos);

      if(error){

        console.log(error);

        alert(
          "Erro ao salvar estabelecimentos"
        );

        return;
      }
    }

    await carregarDados();

    mostrarEstabelecimentosNoMapa();

    alert(
      `✅ ${novosEstabelecimentos.length} estabelecimentos importados`
    );

  } catch(e){

    console.log(e);

    alert(
      "Erro ao importar estabelecimentos"
    );

  }
}
function mostrarEstabelecimentosNoMapa() {

  if (!mapa) return;
  marcadores.forEach(m => {
    mapa.removeLayer(m);
  });
  marcadores = [];
  estabelecimentos.forEach(est => {
    let marcador = L.marker([
      est.lat,
      est.lng
    ]).addTo(mapa);
    marcador.bindPopup(`
      <b>${est.nome}</b><br>
      🏪 ${est.tipo}<br>
      📍 ${est.regiao}
    `);
    marcador.on("mouseover", () => {
      marcador.openPopup();
    });
    marcadores.push(marcador);
  });
}
// 🛣️ ROTA DIRETA
async function desenharRotaDireta(
  pontos,
  r
) {
  try {
    let coords = pontos
      .map(
        p => `${p[1]},${p[0]}`
      )
      .join(";");
    let res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    let data = await res.json();
    if (
      !data.routes ||
      data.routes.length === 0
    ) {
      alert("Rota não encontrada");
      return;
    }
    let rota =
      data.routes[0];
    linhaRota = L.polyline(
      rota.geometry.coordinates.map(
        c => [c[1], c[0]]
      ),
      {
        color: "blue",
        weight: 5
      }
    ).addTo(mapa);
    mapa.fitBounds(
      linhaRota.getBounds()
    );
    document.getElementById(
      "resultados"
    ).innerHTML = `
      <div class="card">
        <h2>
          🏆 Melhor rota
        </h2>
        <p>
          <strong>${r.produto}</strong>
        </p>
        <p>
          🏪 ${r.mercado}
        </p>
        <h3 class="preco">
          💸 R$ ${r.custoTotal.toFixed(2)}
        </h3>
        <p>
          🛣️ ${(
            rota.distance / 1000
          ).toFixed(2)} km
        </p>
        <p>
          ⏱️ ${(
            rota.duration / 60
          ).toFixed(1)} min
        </p>
      </div>
    `;
  } catch {
    alert(
      "Erro ao calcular rota"
    );
  }
}
window.addEventListener("click", e => {
  let menu =
    document.getElementById(
      "menuUsuario"
    );
  let dropdown =
    document.getElementById(
      "dropdownUsuario"
    );
  if (
    menu &&
    !menu.contains(e.target)
  ) {
    dropdown.style.display = "none";
  }
});
// 🚀 START
window.onload = async () => {
  await carregarDados();
  atualizarUI();
  trocarTela("buscaSection");
  setTimeout(() => {
    trocarTela("mapaSection");
    mostrarEstabelecimentosNoMapa();
  }, 500);
  iniciarLocalizacao();
};