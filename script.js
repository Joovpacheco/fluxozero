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
let iconeMelhor = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [35, 35],
});
// 🏪 DADOS
let dadosSalvos = localStorage.getItem("estabelecimentos");
let estabelecimentos =
  dadosSalvos ? JSON.parse(dadosSalvos) : [];
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
function iniciarLocalizacao() {
  navigator.geolocation.getCurrentPosition(pos => {
    usuarioLat = pos.coords.latitude;
    usuarioLng = pos.coords.longitude;
    if (marcadorUsuario) {
      mapa.removeLayer(marcadorUsuario);
    }
    marcadorUsuario = L.marker([
      usuarioLat,
      usuarioLng
    ])
      .addTo(mapa)
      .bindPopup("📍 Você");
    mapa.setView([usuarioLat, usuarioLng], 15);
  });
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
  let filtroTipo =
  document.getElementById(
    "filtroTipo"
  ).value;
  if (!mapa) {
    trocarTela("mapaSection");
  }
  let termo =
    document
      .getElementById("busca")
      .value
      .toLowerCase();
  let resultadosDiv =
    document.getElementById("resultados");
  resultadosDiv.innerHTML = "";
  let resultados = [];
  estabelecimentos.forEach(est => {
    if(
  filtroTipo &&
  est.tipo !== filtroTipo
){
  return;
}
    (est.produtos || []).forEach(prod => {
      if (
        !prod.nome
          .toLowerCase()
          .includes(termo)
      ) return;
      let distancia = usuarioLat
        ? calcularDistancia(
            usuarioLat,
            usuarioLng,
            est.lat,
            est.lng
          )
        : 0;
      resultados.push({
        produto: prod.nome,
        preco: prod.preco,
        estabelecimento: est.nome,
        distancia,
        lat: est.lat,
        lng: est.lng
      });
    });
  });
  resultados.sort((a, b) => a.preco - b.preco);
  resultados.forEach((r, i) => {
    resultadosDiv.innerHTML += `
      <div class="card">
        <strong>${r.produto}</strong>
        ${
          i === 0
            ? "<span style='color:#22c55e'> 🔥 Melhor</span>"
            : ""
        }
        <br><br>
        🏪 ${r.estabelecimento}<br>
        💰 R$ ${r.preco}<br>
        📍 ${r.distancia.toFixed(2)} km
      </div>
    `;
  });
  mostrarNoMapa(resultados);
}
// 🗺️ MOSTRAR NO MAPA
function mostrarNoMapa(lista) {
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
  try {
    let centro = mapa.getCenter();
    let url =
      `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="fuel"](around:2000,${centro.lat},${centro.lng});out;`;
    let res = await fetch(url);
    let data = await res.json();
    postos = [];
    data.elements.forEach(el => {
      if (!el.lat) return;
      let marker = L.marker([
        el.lat,
        el.lon
      ])
        .addTo(mapa)
        .bindPopup("⛽ Posto");
      marcadores.push(marker);
      postos.push({
        nome: el.tags?.name || "Posto",
        lat: el.lat,
        lng: el.lon,
        preco: precoGasolina
      });
    });
    alert(`⛽ ${postos.length} postos encontrados`);
  } catch {
    alert("Erro ao buscar postos");
  }
}
// 🧠 MELHOR COMBO
function calcularMelhorCombo(produto) {
  if (!usuarioLat || postos.length === 0) {
    return null;
  }
  let melhor = null;
  estabelecimentos.forEach(est => {
    est.produtos.forEach(prod => {
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

  if (!usuarioLat) {
    return alert(
      "Ative sua localização primeiro!"
    );
  }
  let termo =
    document
      .getElementById("busca")
      .value
      .toLowerCase();
  // 🔥 SEM POSTOS
  if (postos.length === 0) {
    let melhor = null;
    estabelecimentos.forEach(est => {
      est.produtos.forEach(prod => {
        if (
          !prod.nome
            .toLowerCase()
            .includes(termo)
        ) return;
        let dist =
          calcularDistancia(
            usuarioLat,
            usuarioLng,
            est.lat,
            est.lng
          );
        let custo =
          prod.preco;
        if (
          !melhor ||
          custo < melhor.custoTotal
        ) {
          melhor = {
            produto: prod.nome,
            mercado: est.nome,
            custoTotal: custo,
            lat: est.lat,
            lng: est.lng
          };
        }
      });
    });
    if (!melhor) {
      return alert("Nada encontrado");
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
    let mMercado = L.marker(
      [melhor.lat, melhor.lng],
      { icon: iconeMelhor }
    )
      .addTo(mapa)
      .bindPopup("🏪 Melhor mercado");
    marcadores.push(
      mUser,
      mMercado
    );
    let pontos = [
      [usuarioLat, usuarioLng],
      [melhor.lat, melhor.lng]
    ];
    desenharRotaDireta(
      pontos,
      melhor
    );
    return;
  }
  // 🔥 COM POSTOS
  let r =
    calcularMelhorCombo(termo);
  if (!r) {
    return alert("Nada encontrado");
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
  let mPosto = L.marker([
    r.postoLat,
    r.postoLng
  ])
    .addTo(mapa)
    .bindPopup("⛽ Posto");
  let mMercado = L.marker(
    [r.lat, r.lng],
    { icon: iconeMelhor }
  )
    .addTo(mapa)
    .bindPopup("🏪 Melhor mercado");
  marcadores.push(
    mUser,
    mPosto,
    mMercado
  );
  let pontos = [
    [usuarioLat, usuarioLng],
    [r.postoLat, r.postoLng],
    [r.lat, r.lng]
  ];
  desenharRota(pontos, r);
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
      "https://i.imgur.com/6VBx3io.png";
  } else {
    btnLogin.style.display = "block";
    menuUsuario.style.display = "none";
  }
}
// Perfil Usuario
function abrirPerfil() {

  trocarTela("perfilSection");
  document.getElementById(
    "perfilNome"
  ).value =
    usuarioLogado.nome || "";
  document.getElementById(
    "perfilFoto"
  ).value =
    usuarioLogado.foto || "";
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
          (${est.avaliacoes.length} avaliações)
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
    foto: "https://i.imgur.com/6VBx3io.png"
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
function cadastrar() {
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
    id: Date.now(),
    dono: usuarioLogado.user,
    nome,
    tipo,
    regiao,
    lat,
    lng,
    produtos:[],
    avaliacoes:[]
  };
  estabelecimentos.push(novo);
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
  alert("🏪 Estabelecimento cadastrado!");
  document.getElementById("nomeEst").value = "";
  document.getElementById("regiaoEst").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
}
//Excluir Estabelecimentos 
function excluirEstabelecimento(id) {
  estabelecimentos =
    estabelecimentos.filter(
      e => e.id !== id
    );
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
  abrirGerenciamento();
}
// ⭐ AVALIAR ESTABELECIMENTO
function avaliarEstabelecimento(id){

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

  est.avaliacoes.push({
    usuario:
      usuarioLogado.user,
    nota,
    comentario
  });

  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );

  gerenciarEstabelecimentos();

  alert("⭐ Avaliação enviada!");

}
// Produtos
function abrirProdutos(id) {
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
    );
  let validade =
    parseInt(
      prompt("Validade em dias")
    );
    est.produtos.push({
      nome,
      preco,
      quantidade,
      validade
   });
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
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
function adicionarProdutoGerenciamento(id) {

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
      prompt("Preço do produto")
    );
  if (isNaN(preco)) {
    alert("Preço inválido");
    return;
  }
  let quantidade =
    parseInt(
      prompt("Quantidade")
    );
  if (isNaN(quantidade)) {
    quantidade = 0;
  }
  let validade =
    parseInt(
      prompt("Validade em dias")
    );
  if (isNaN(validade)) {
    validade = 0;
  }
  est.produtos.push({
    nome,
    preco,
    quantidade,
    validade
  });
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
  gerenciarEstabelecimentos();
  alert("✅ Produto adicionado!");
}
// 🗑️ REMOVER PRODUTO
function removerProduto(estId, prodIndex) {

  let est =
    estabelecimentos.find(
      e => e.id === estId
    );
  if (!est) return;
  est.produtos.splice(prodIndex, 1);
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
  gerenciarEstabelecimentos();
}
function salvarProduto(estId,index){

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
  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );
  alert("✅ Produto atualizado");
}
function removerProduto(estId,index){

  let est =
    estabelecimentos.find(
      e => e.id === estId
    );

  if(!est) return;

  est.produtos.splice(index,1);

  localStorage.setItem(
    "estabelecimentos",
    JSON.stringify(estabelecimentos)
  );

  gerenciarEstabelecimentos();

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
    !menu.contains(e.target)
  ) {
    dropdown.style.display = "none";
  }
});
// 🚀 START
window.onload = () => {
  atualizarUI();
  trocarTela("buscaSection");
};
