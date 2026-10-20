/**
 * Cafeteria XV - Script Principal Front-end
 * Gerenciamento de Pedidos, Filtros de Produtos, Validações e Demonstrações Visuais
 * 
 * NOTA: Esta lógica em JavaScript atende exclusivamente ao protótipo de front-end
 * e persistência temporária no navegador (localStorage).
 * Toda a persistência definitiva, regras de negócio e autenticação serão
 * implementadas posteriormente no IntelliJ com Spring Boot, Thymeleaf, Spring Security e MySQL.
 */

document.addEventListener("DOMContentLoaded", () => {
    inicializarBadges();
    inicializarProdutos();
    inicializarPedidos();
    inicializarAdmin();
});

/* ==========================================================
   1. GERENCIAMENTO CENTRAL DO PEDIDO (LOCALSTORAGE)
   ========================================================== */
const STORAGE_KEY_PEDIDO = "pedidoCafeteria";
const STORAGE_KEY_HISTORICO = "historicoPedidosXV";
const STORAGE_KEY_USUARIO = "usuarioCafeteriaXV";

function obterPedido() {
    try {
        const dados = localStorage.getItem(STORAGE_KEY_PEDIDO);
        return dados ? JSON.parse(dados) : [];
    } catch (e) {
        console.error("Erro ao ler pedido do localStorage:", e);
        return [];
    }
}

function salvarPedido(itens) {
    try {
        localStorage.setItem(STORAGE_KEY_PEDIDO, JSON.stringify(itens));
        atualizarBadges();
    } catch (e) {
        console.error("Erro ao salvar pedido no localStorage:", e);
    }
}

function adicionarAoPedido(id, nome, preco, imagem, quantidade, categoria = "") {
    const pedido = obterPedido();
    const itemExistente = pedido.find(item => item.id === Number(id));

    if (itemExistente) {
        itemExistente.quantidade = Math.min(20, itemExistente.quantidade + quantidade);
    } else {
        pedido.push({
            id: Number(id),
            nome: nome,
            preco: Number(preco),
            imagem: imagem,
            quantidade: Math.min(20, Math.max(1, quantidade)),
            categoria: categoria
        });
    }

    salvarPedido(pedido);
    exibirToastFeedback(`${quantidade}x "${nome}" adicionado(s) ao seu pedido!`);
}

function alterarQuantidadeItem(id, delta) {
    let pedido = obterPedido();
    const item = pedido.find(p => p.id === Number(id));

    if (!item) return;

    item.quantidade += delta;

    if (item.quantidade <= 0) {
        pedido = pedido.filter(p => p.id !== Number(id));
    } else if (item.quantidade > 20) {
        item.quantidade = 20;
    }

    salvarPedido(pedido);
    renderizarPaginaPedidos();
}

function removerItemPedido(id) {
    let pedido = obterPedido();
    pedido = pedido.filter(p => p.id !== Number(id));
    salvarPedido(pedido);
    renderizarPaginaPedidos();
    exibirToastFeedback("Item removido do seu pedido.");
}

function limparPedidoAtivo() {
    salvarPedido([]);
    renderizarPaginaPedidos();
}

function inicializarBadges() {
    atualizarBadges();
}

function atualizarBadges() {
    const pedido = obterPedido();
    const totalItens = pedido.reduce((acc, item) => acc + item.quantidade, 0);

    // Badge no menu de navegação
    document.querySelectorAll(".nav-badge-pedidos").forEach(badge => {
        if (totalItens > 0) {
            badge.textContent = totalItens;
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    });

    // Badge no botão flutuante de pedidos
    const badgeFlutuante = document.querySelector("#carrinho-badge-flutuante");
    const containerFlutuante = document.querySelector("#carrinho-flutuante");
    if (badgeFlutuante && containerFlutuante) {
        if (totalItens > 0) {
            badgeFlutuante.textContent = totalItens;
            containerFlutuante.style.display = "block";
        } else {
            containerFlutuante.style.display = "none";
        }
    }
}

function exibirToastFeedback(texto) {
    let toast = document.querySelector("#mensagem-pedido");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "mensagem-pedido";
        toast.className = "mensagem-pedido";
        document.body.appendChild(toast);
    }

    toast.textContent = texto;
    toast.classList.add("mostrar");

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3200);
}

/* ==========================================================
   2. PÁGINA DE PRODUTOS (FILTROS, BUSCA E ADIÇÃO)
   ========================================================== */
function inicializarProdutos() {
    const paginaProdutos = document.querySelector(".pagina-produtos");
    if (!paginaProdutos) return;

    // Filtros de Categoria
    const botoesFiltro = document.querySelectorAll(".btn-filtro");
    const cardsProdutos = document.querySelectorAll(".col-produto");

    botoesFiltro.forEach(botao => {
        botao.addEventListener("click", () => {
            botoesFiltro.forEach(b => b.classList.remove("active"));
            botao.classList.add("active");

            const categoria = botao.dataset.categoria;
            filtrarProdutos(categoria, obterTextoBusca());
        });
    });

    // Busca por Texto
    const campoBusca = document.querySelector("#pesquisa-produto");
    if (campoBusca) {
        campoBusca.addEventListener("input", () => {
            const categoriaAtiva = document.querySelector(".btn-filtro.active")?.dataset.categoria || "todos";
            filtrarProdutos(categoriaAtiva, campoBusca.value.trim().toLowerCase());
        });
    }

    function obterTextoBusca() {
        return (document.querySelector("#pesquisa-produto")?.value || "").trim().toLowerCase();
    }

    function filtrarProdutos(categoria, texto) {
        let visiveis = 0;
        cardsProdutos.forEach(card => {
            const cardCategoria = card.dataset.categoria || "";
            const titulo = (card.querySelector("h2")?.textContent || "").toLowerCase();
            const descricao = (card.querySelector("p")?.textContent || "").toLowerCase();

            const bateuCategoria = (categoria === "todos" || cardCategoria === categoria);
            const bateuTexto = (texto === "" || titulo.includes(texto) || descricao.includes(texto));

            if (bateuCategoria && bateuTexto) {
                card.style.display = "";
                visiveis++;
            } else {
                card.style.display = "none";
            }
        });

        const semResultados = document.querySelector("#sem-produtos-encontrados");
        if (semResultados) {
            semResultados.style.display = visiveis === 0 ? "block" : "none";
        }
    }

    // Botões de incremento/decremento nos cards
    document.querySelectorAll(".btn-qtd-menos").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector(".quantidade-produto");
            let v = parseInt(input.value) || 1;
            if (v > 1) input.value = v - 1;
        });
    });

    document.querySelectorAll(".btn-qtd-mais").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector(".quantidade-produto");
            let v = parseInt(input.value) || 1;
            if (v < 20) input.value = v + 1;
        });
    });

    // Botões "Adicionar ao pedido"
    document.querySelectorAll(".btn-adicionar").forEach(botao => {
        botao.addEventListener("click", () => {
            const id = botao.dataset.id;
            const nome = botao.dataset.nome;
            const preco = parseFloat(botao.dataset.preco);
            const imagem = botao.dataset.imagem;
            const categoria = botao.dataset.categoria || "";

            const card = botao.closest(".produto-card");
            const campoQuantidade = card.querySelector(".quantidade-produto");
            const quantidade = parseInt(campoQuantidade ? campoQuantidade.value : 1) || 1;

            if (quantidade < 1 || quantidade > 20) {
                alert("Por favor, selecione uma quantidade válida entre 1 e 20.");
                return;
            }

            adicionarAoPedido(id, nome, preco, imagem, quantidade, categoria);

            if (campoQuantidade) {
                campoQuantidade.value = 1;
            }
        });
    });
}

/* ==========================================================
   3. PÁGINA DE PEDIDOS (ÁREA DO CLIENTE & FINALIZAÇÃO)
   ========================================================== */
let tipoAtendimentoSelecionado = "balcao";
let mesaSelecionada = null;
const TAXA_DELIVERY = 7.00;

function inicializarPedidos() {
    const paginaPedidos = document.querySelector(".pagina-pedidos");
    if (!paginaPedidos) return;

    // Gerenciamento provisório de usuário
    carregarUsuarioCliente();

    const btnSair = document.querySelector("#btn-sair-cliente");
    if (btnSair) {
        btnSair.addEventListener("click", () => {
            if (confirm("Deseja sair da sua conta de cliente (simulação de logout)?")) {
                localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify({ logado: false, nome: "Visitante", email: "" }));
                carregarUsuarioCliente();
                exibirToastFeedback("Você saiu da sua conta (modo visitante).");
            }
        });
    }

    const btnTrocarUsuario = document.querySelector("#btn-entrar-cliente");
    if (btnTrocarUsuario) {
        btnTrocarUsuario.addEventListener("click", () => {
            const nome = prompt("Informe seu nome para login de demonstração:", "Mariana Silva");
            if (nome && nome.trim()) {
                const email = prompt("Informe seu e-mail:", "mariana.silva@exemplo.com") || "cliente@cafeteriaxv.com.br";
                localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify({ logado: true, nome: nome.trim(), email: email.trim() }));
                carregarUsuarioCliente();
                exibirToastFeedback(`Bem-vindo(a), ${nome.trim()}!`);
            }
        });
    }

    // Seleção de Tipo de Atendimento (Balcão, Mesas 1 a 15, Entrega)
    const cardsAtendimento = document.querySelectorAll(".tipo-card");
    const painelMesas = document.querySelector("#painel-mesas");
    const painelEntrega = document.querySelector("#painel-entrega");

    cardsAtendimento.forEach(card => {
        card.addEventListener("click", () => {
            cardsAtendimento.forEach(c => c.classList.remove("selecionado"));
            card.classList.add("selecionado");

            tipoAtendimentoSelecionado = card.dataset.tipo;

            if (painelMesas) painelMesas.classList.remove("ativo");
            if (painelEntrega) painelEntrega.classList.remove("ativo");

            if (tipoAtendimentoSelecionado === "mesa") {
                if (painelMesas) painelMesas.classList.add("ativo");
            } else if (tipoAtendimentoSelecionado === "entrega") {
                if (painelEntrega) painelEntrega.classList.add("ativo");
            }

            renderizarResumoFinanceiro();
        });
    });

    // Botões das 15 mesas
    document.querySelectorAll(".btn-mesa").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".btn-mesa").forEach(b => b.classList.remove("selecionada"));
            btn.classList.add("selecionada");
            mesaSelecionada = btn.dataset.mesa;
            const displayMesa = document.querySelector("#mesa-selecionada-display");
            if (displayMesa) {
                displayMesa.textContent = `Mesa ${mesaSelecionada} selecionada`;
            }
        });
    });

    // Envio e Validação do Pedido
    const formFinalizarPedido = document.querySelector("#form-finalizar-pedido");
    if (formFinalizarPedido) {
        formFinalizarPedido.addEventListener("submit", (e) => {
            e.preventDefault();
            processarEnvioPedido();
        });
    }

    renderizarPaginaPedidos();
    carregarHistoricoCliente();
}

function carregarUsuarioCliente() {
    let usuario = { logado: true, nome: "Mariana Silva", email: "mariana.silva@exemplo.com" };
    try {
        const salvo = localStorage.getItem(STORAGE_KEY_USUARIO);
        if (salvo) usuario = JSON.parse(salvo);
    } catch (e) {
        console.error("Erro ao carregar usuário:", e);
    }

    const nomeEl = document.querySelector("#cliente-nome-display");
    const emailEl = document.querySelector("#cliente-email-display");
    const avatarEl = document.querySelector("#cliente-avatar-display");
    const btnSair = document.querySelector("#btn-sair-cliente");
    const btnEntrar = document.querySelector("#btn-entrar-cliente");

    if (nomeEl) nomeEl.textContent = usuario.logado ? usuario.nome : "Visitante (Não autenticado)";
    if (emailEl) emailEl.textContent = usuario.logado ? usuario.email : "Clique em entrar para se autenticar";
    if (avatarEl) avatarEl.textContent = usuario.logado ? usuario.nome.charAt(0).toUpperCase() : "?";

    if (btnSair) btnSair.style.display = usuario.logado ? "inline-block" : "none";
    if (btnEntrar) btnEntrar.style.display = usuario.logado ? "none" : "inline-block";
}

function renderizarPaginaPedidos() {
    const pedido = obterPedido();
    const containerItens = document.querySelector("#lista-itens-pedido");
    const containerVazio = document.querySelector("#carrinho-vazio-card");
    const containerResumo = document.querySelector("#resumo-pedido-container");

    if (!containerItens) return;

    if (pedido.length === 0) {
        containerItens.innerHTML = "";
        if (containerVazio) containerVazio.style.display = "block";
        if (containerResumo) containerResumo.style.display = "none";
        return;
    }

    if (containerVazio) containerVazio.style.display = "none";
    if (containerResumo) containerResumo.style.display = "block";

    let html = "";
    pedido.forEach(item => {
        const subtotalItem = (item.preco * item.quantidade).toFixed(2).replace(".", ",");
        const precoUnit = item.preco.toFixed(2).replace(".", ",");

        html += `
            <div class="item-pedido-row" data-id="${item.id}">
                <img src="${item.imagem}" alt="${item.nome}" class="item-pedido-foto">
                <div class="item-pedido-info">
                    <div class="item-pedido-nome">${item.nome}</div>
                    <div class="item-pedido-unitario">R$ ${precoUnit} cada</div>
                </div>
                <div class="controle-quantidade">
                    <button type="button" class="btn-item-menos" onclick="alterarQuantidadeItem(${item.id}, -1)" title="Diminuir quantidade">−</button>
                    <input type="text" readonly value="${item.quantidade}" class="quantidade-produto">
                    <button type="button" class="btn-item-mais" onclick="alterarQuantidadeItem(${item.id}, 1)" title="Aumentar quantidade">+</button>
                </div>
                <div class="item-pedido-subtotal">R$ ${subtotalItem}</div>
                <button type="button" class="btn-remover-item" onclick="removerItemPedido(${item.id})" title="Remover item">
                    ✕
                </button>
            </div>
        `;
    });

    containerItens.innerHTML = html;
    renderizarResumoFinanceiro();
}

function renderizarResumoFinanceiro() {
    const pedido = obterPedido();
    const subtotal = pedido.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const taxaEntrega = tipoAtendimentoSelecionado === "entrega" ? TAXA_DELIVERY : 0.00;
    const totalGeral = subtotal + taxaEntrega;

    const subtotalEl = document.querySelector("#resumo-subtotal");
    const taxaEl = document.querySelector("#resumo-taxa-entrega");
    const totalEl = document.querySelector("#resumo-total-geral");

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
    if (taxaEl) {
        taxaEl.textContent = taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2).replace(".", ",")}` : "Grátis";
    }
    if (totalEl) totalEl.textContent = `R$ ${totalGeral.toFixed(2).replace(".", ",")}`;
}

function processarEnvioPedido() {
    const pedido = obterPedido();
    if (pedido.length === 0) {
        alert("Seu pedido está vazio! Adicione itens do cardápio antes de finalizar.");
        return;
    }

    // Validação de Usuário
    let usuario = { logado: true, nome: "Mariana Silva", email: "mariana.silva@exemplo.com" };
    try {
        const salvo = localStorage.getItem(STORAGE_KEY_USUARIO);
        if (salvo) usuario = JSON.parse(salvo);
    } catch (e) {}

    if (!usuario.logado) {
        alert("Conforme regra de negócio da Cafeteria XV, é necessário estar cadastrado/logado para solicitar pedidos. Por favor, identifique-se.");
        const nome = prompt("Informe seu nome completo para se cadastrar:", "Mariana Silva");
        if (!nome || !nome.trim()) return;
        usuario = { logado: true, nome: nome.trim(), email: "cliente@cafeteriaxv.com.br" };
        localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(usuario));
        carregarUsuarioCliente();
    }

    // Validações do Tipo de Atendimento
    let detalheAtendimento = "Balcão (Retirada no caixa)";
    if (tipoAtendimentoSelecionado === "mesa") {
        if (!mesaSelecionada) {
            alert("Por favor, selecione qual das 15 mesas você está ocupando.");
            const painelMesas = document.querySelector("#painel-mesas");
            if (painelMesas) painelMesas.scrollIntoView({ behavior: "smooth" });
            return;
        }
        detalheAtendimento = `Mesa ${mesaSelecionada}`;
    } else if (tipoAtendimentoSelecionado === "entrega") {
        const rua = document.querySelector("#entrega-rua")?.value.trim();
        const numero = document.querySelector("#entrega-numero")?.value.trim();
        const bairro = document.querySelector("#entrega-bairro")?.value.trim();
        const cep = document.querySelector("#entrega-cep")?.value.trim();

        if (!rua || !numero || !bairro) {
            alert("Por favor, preencha o endereço completo para entrega (Rua, Número e Bairro são obrigatórios).");
            return;
        }
        detalheAtendimento = `Entrega em: ${rua}, Nº ${numero} - ${bairro}${cep ? " (CEP: " + cep + ")" : ""}`;
    }

    // Pagamento
    const pagamentoSelecionado = document.querySelector("input[name='forma-pagamento']:checked")?.value || "Cartão";
    const observacoes = document.querySelector("#pedido-observacoes")?.value.trim() || "Nenhuma";

    const subtotal = pedido.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const taxa = tipoAtendimentoSelecionado === "entrega" ? TAXA_DELIVERY : 0.00;
    const total = subtotal + taxa;

    // Gerar Pedido
    const numeroPedido = Math.floor(1000 + Math.random() * 9000);
    const dataHora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const novoPedido = {
        id: numeroPedido,
        cliente: usuario.nome,
        itens: pedido,
        tipoAtendimento: tipoAtendimentoSelecionado,
        detalheAtendimento: detalheAtendimento,
        pagamento: pagamentoSelecionado,
        observacoes: observacoes,
        subtotal: subtotal,
        taxaEntrega: taxa,
        total: total,
        hora: dataHora,
        status: "Em atendimento" // Inicialmente em atendimento conforme regras do professor
    };

    // Salvar no histórico
    salvarNoHistorico(novoPedido);

    // Limpar pedido ativo
    salvarPedido([]);

    // Exibir Modal de Sucesso
    exibirModalConfirmacao(novoPedido);
    renderizarPaginaPedidos();
    carregarHistoricoCliente();
}

function salvarNoHistorico(pedido) {
    try {
        let historico = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORICO)) || [];
        historico.unshift(pedido); // mais recente primeiro
        localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));
    } catch (e) {
        console.error("Erro ao salvar histórico:", e);
    }
}

function obterHistorico() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORICO)) || [];
    } catch (e) {
        return [];
    }
}

function carregarHistoricoCliente() {
    const container = document.querySelector("#historico-pedidos-cliente");
    if (!container) return;

    const historico = obterHistorico();

    if (historico.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <p>Nenhum pedido realizado recentemente nesta sessão.</p>
            </div>
        `;
        return;
    }

    let html = "";
    historico.slice(0, 5).forEach(ped => {
        const badgeClasse = ped.status === "Em atendimento" ? "tag-em-atendimento" : "tag-finalizado";
        const totalFmt = ped.total.toFixed(2).replace(".", ",");
        const listaResumo = ped.itens.map(i => `${i.quantidade}x ${i.nome}`).join(", ");

        html += `
            <div class="card-pedido-admin ${ped.status === 'Em atendimento' ? 'em-atendimento' : 'finalizado'}">
                <div class="pedido-admin-topo">
                    <div>
                        <strong>Pedido #${ped.id}</strong> • <span class="text-muted">${ped.hora}</span>
                        <div class="small text-muted">${ped.detalheAtendimento}</div>
                    </div>
                    <span class="pedido-tag-status ${badgeClasse}">${ped.status}</span>
                </div>
                <div class="small mb-2 text-dark">${listaResumo}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small text-muted">Pagamento: ${ped.pagamento}</span>
                    <strong class="text-dark">R$ ${totalFmt}</strong>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function exibirModalConfirmacao(pedido) {
    const modalEl = document.querySelector("#modal-pedido-confirmado");
    if (!modalEl) {
        alert(`Pedido #${pedido.id} realizado com sucesso!\nStatus: ${pedido.status}\nTotal: R$ ${pedido.total.toFixed(2).replace(".", ",")}\nLocal: ${pedido.detalheAtendimento}`);
        return;
    }

    document.querySelector("#modal-pedido-numero").textContent = `#${pedido.id}`;
    document.querySelector("#modal-pedido-atendimento").textContent = pedido.detalheAtendimento;
    document.querySelector("#modal-pedido-total").textContent = `R$ ${pedido.total.toFixed(2).replace(".", ",")}`;
    document.querySelector("#modal-pedido-tempo").textContent = pedido.tipoAtendimento === "entrega" ? "35 a 45 minutos" : "10 a 15 minutos";

    if (window.bootstrap && bootstrap.Modal) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        modalEl.style.display = "block";
    }
}

/* ==========================================================
   4. PAINEL ADMINISTRATIVO (GERENTES DA CAFETERIA)
   ========================================================== */
function inicializarAdmin() {
    const paginaAdmin = document.querySelector(".pagina-admin");
    if (!paginaAdmin) return;

    // Se histórico estiver vazio, popula com dados de exemplo da Cafeteria XV
    let historico = obterHistorico();
    if (historico.length === 0) {
        historico = [
            {
                id: 1021,
                cliente: "Carlos Eduardo Mendes",
                itens: [
                    { id: 2, nome: "Cappuccino Italiano", quantidade: 2, preco: 12.00 },
                    { id: 7, nome: "Pão de Queijo Mineiro", quantidade: 1, preco: 9.50 }
                ],
                tipoAtendimento: "mesa",
                detalheAtendimento: "Mesa 04",
                pagamento: "Pix",
                observacoes: "Caprichar no polvilhado de canela",
                subtotal: 33.50,
                taxaEntrega: 0,
                total: 33.50,
                hora: "09:15",
                status: "Em atendimento"
            },
            {
                id: 1022,
                cliente: "Ana Beatriz Santos",
                itens: [
                    { id: 1, nome: "Café Expresso", quantidade: 1, preco: 6.00 },
                    { id: 8, nome: "Croissant Francês Manteiga", quantidade: 1, preco: 10.50 }
                ],
                tipoAtendimento: "balcao",
                detalheAtendimento: "Balcão (Retirada rápida)",
                pagamento: "Cartão",
                observacoes: "Sem açúcar",
                subtotal: 16.50,
                taxaEntrega: 0,
                total: 16.50,
                hora: "09:28",
                status: "Em atendimento"
            },
            {
                id: 1019,
                cliente: "Roberto Vasconcelos",
                itens: [
                    { id: 10, nome: "Sanduíche Natural de Frango", quantidade: 2, preco: 18.00 },
                    { id: 4, nome: "Iced Coffee Especial", quantidade: 2, preco: 13.00 }
                ],
                tipoAtendimento: "entrega",
                detalheAtendimento: "Entrega em: Rua XV de Novembro, 250, Apto 402 - Centro",
                pagamento: "Cartão",
                observacoes: "Deixar na portaria",
                subtotal: 62.00,
                taxaEntrega: 7.00,
                total: 69.00,
                hora: "08:50",
                status: "Finalizados"
            }
        ];
        localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));
    }

    // Alternância de Abas: "Em atendimento" e "Finalizados"
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            renderizarPainelAdmin(tab.dataset.status);
        });
    });

    renderizarPainelAdmin("Em atendimento");
}

function renderizarPainelAdmin(filtroStatus = "Em atendimento") {
    const container = document.querySelector("#container-pedidos-admin");
    if (!container) return;

    const historico = obterHistorico();

    // Contadores
    const countAtendimento = historico.filter(p => p.status === "Em atendimento").length;
    const countFinalizados = historico.filter(p => p.status === "Finalizados").length;

    const badgeAtend = document.querySelector("#count-em-atendimento");
    const badgeFin = document.querySelector("#count-finalizados");
    if (badgeAtend) badgeAtend.textContent = countAtendimento;
    if (badgeFin) badgeFin.textContent = countFinalizados;

    const filtrados = historico.filter(p => p.status === filtroStatus);

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div class="box-secao text-center py-5">
                <h4>Nenhum pedido com status "${filtroStatus}"</h4>
                <p class="text-muted">Todos os atendimentos deste setor estão em dia.</p>
            </div>
        `;
        return;
    }

    let html = "";
    filtrados.forEach(ped => {
        const totalFmt = ped.total.toFixed(2).replace(".", ",");
        const itensListados = ped.itens.map(i => `<li>${i.quantidade}x <strong>${i.nome}</strong> (R$ ${(i.preco * i.quantidade).toFixed(2).replace(".", ",")})</li>`).join("");

        const ehEmAtendimento = ped.status === "Em atendimento";
        const tagClasse = ehEmAtendimento ? "tag-em-atendimento" : "tag-finalizado";

        const botaoAcao = ehEmAtendimento
            ? `<button type="button" class="btn btn-sm btn-dourado" onclick="marcarComoFinalizadoAdmin(${ped.id})">✓ Concluir Atendimento</button>`
            : `<span class="badge bg-success">Concluído</span>`;

        html += `
            <div class="card-pedido-admin ${ehEmAtendimento ? 'em-atendimento' : 'finalizado'}">
                <div class="pedido-admin-topo">
                    <div>
                        <span class="fs-5 fw-bold text-dark">Pedido #${ped.id}</span>
                        <span class="ms-2 text-muted small">Registrado às ${ped.hora}</span>
                        <div class="fw-semibold text-secondary mt-1">👤 Cliente: ${ped.cliente}</div>
                        <div class="text-primary mt-1">📍 Local: <strong>${ped.detalheAtendimento}</strong></div>
                    </div>
                    <div class="text-end">
                        <span class="pedido-tag-status ${tagClasse}">${ped.status}</span>
                        <div class="fs-5 fw-bold text-dark mt-2">R$ ${totalFmt}</div>
                        <div class="small text-muted">Pgto: ${ped.pagamento}</div>
                    </div>
                </div>

                <div class="my-3">
                    <strong class="small text-muted text-uppercase">Itens Solicitados:</strong>
                    <ul class="mb-1 mt-1 small">
                        ${itensListados}
                    </ul>
                    ${ped.observacoes && ped.observacoes !== 'Nenhuma' ? `<div class="small bg-light p-2 rounded mt-2"><strong>Obs:</strong> ${ped.observacoes}</div>` : ''}
                </div>

                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span class="small text-muted">ID Sistema: XV-${ped.id}</span>
                    <div>
                        ${botaoAcao}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function marcarComoFinalizadoAdmin(id) {
    let historico = obterHistorico();
    const pedido = historico.find(p => p.id === Number(id));
    if (pedido) {
        pedido.status = "Finalizados";
        localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));
        exibirToastFeedback(`Pedido #${id} marcado como finalizado!`);
        renderizarPainelAdmin("Em atendimento");
    }
}
