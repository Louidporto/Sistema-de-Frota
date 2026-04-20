/**
 * SISTEMA - GESTÃO DE FROTA MACBRAS
 * Configurações e Lógica de Negócio
 */

// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCpSqGHy3YTnN-IkB42YnNiOdY6Y5MAIEY",
    authDomain: "controle-km-35-37.firebaseapp.com",
    projectId: "controle-km-35-37",
    databaseURL: "https://controle-km-35-37-default-rtdb.firebaseio.com",
    storageBucket: "controle-km-35-37.firebasestorage.app",
    messagingSenderId: "876899977468",
    appId: "1:876899977468:web:f91bffd951a65f7fb9ef79"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 2. FUNÇÕES DE UTILIDADE
function atualizarDataHora() {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-br').split('/').reverse().join('-');
    const hora = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
    return { data, hora };
}

// 3. CONSTRUÇÃO DINÂMICA DO MODAL DE SAÍDA (VIA JS)
function criarModalSaida() {
    const tempo = atualizarDataHora();
    const dataFormatada = tempo.data.split('-').reverse().join('/');

    const modalHtml = `
        <div id="modalSaida" class="modal" style="display: flex;">
            <div class="modal-content">
                <h3>REGISTRAR SAÍDA</h3>
                <div class="grid-tempo">
                    <div class="grupo-input">
                        <label>Data de Saída</label>
                        <input type="text" value="${dataFormatada}" class="input-destaque-verde" readonly>
                    </div>
                    <div class="grupo-input">
                        <label>Hora de Saída</label>
                        <input type="text" value="${tempo.hora}" class="input-destaque-verde" readonly>
                    </div>
                </div>
                <div class="grupo-input">
                    <label>Veículo</label>
                    <select id="placaVeiculo">
                        <option value="">Selecione o Veículo</option>
                        <option value="Argo RVX0F35">Argo RVX0F35</option>
                        <option value="Argo RVX0F37">Argo RVX0F37</option>
                        <option value="Ducato PYI2E43">Ducato PYI2E43</option>
                    </select>
                </div>

                <div id="containerNivelSaida" style="margin: 15px 0; display: none; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #fff;">
                    <label style="font-size: 0.75rem; color: #666; display: block; margin-bottom: 8px; font-weight: bold;">
                        ⛽ ÚLTIMO NÍVEL REGISTRADO:
                    </label>
                    <div id="graficoCombustivelSaida" style="display: flex; gap: 3px; background: #eee; padding: 4px; border-radius: 4px;">
                        </div>
                    <div id="textoNivelSaida" style="text-align: center; font-weight: bold; font-size: 0.85rem; margin-top: 5px; color: #28a745;">
                        --/12
                    </div>
                </div>
                <div class="grupo-input">
                    <label>Motorista</label>
                    <select id="selectMotorista">
                        <option value="">Selecione o Motorista</option>
                        <option value="Marcelo Motta Cardoso">Marcelo Motta Cardoso</option>
                        <option value="Daniela Claudia">Daniela Claudia</option>
                        <option value="Gabriel Louid Da Cunha Porto">Gabriel Louid da Cunha Porto</option>
                        <option value="Carlos Eduardo de Faria">Carlos Eduardo de Faria</option>
                        <option value="Gracy Theodoro Juniorr">Gracy Theodoro Junior</option>
                        <option value="Grace Melody Maciel">Grace Melody Maciel</option>
                        <option value="Ricardo Marçal da Silva">Ricardo Marçal da Silva</option>
                        <option value="Roberto Assis Silva">Roberto Assis Silva</option>
                        <option value="Eduardo de souza diniz">Eduardo de souza diniz</option>
                        <option value="Cibely Carvalho de Lucas">Cibely Carvalho de Lucas</option>
                    </select>
                </div>
                <div class="grupo-input">
                    <label>Quilometragem Inicial</label>
                    <input type="number" id="kmSaida" placeholder="Ex: 12500">
                </div>
                <div class="grupo-input">
                    <label>Motivo</label>
                    <select id="motivoSelecao">
                        <option value="">Selecione o motivo...</option>
                        <option value="entrega">Entrega</option>
                        <option value="outros">Outros Motivos</option>
                    </select>
                </div>
                <div id="camposEntrega" style="display: none;">
                    <input type="text" id="nf" placeholder="Número da(s) NF(s) Ex: 9999, 9999">
                    <input type="number" id="valorNf" placeholder="Soma do Valor da(s) NF(s) R$">
                </div>
                <div id="camposOutros" style="display: none;">
                    <textarea id="descricaoMotivo" placeholder="Descreva o motivo..."></textarea>
                </div>
                <button type="button" class="btn-principal" id="btnExecutarLancar">LANÇAR SAÍDA</button>
                <button class="btn-secundario" id="btnCancelarSaida">CANCELAR</button>
            </div>
        </div>
    `;

    // Insere o modal no final do body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

// --- CORREÇÃO AQUI: Capturando o ID correto 'placaVeiculo' ---
const selectVeic = document.getElementById('placaVeiculo'); 

selectVeic.onchange = function() {
    const vNome = this.value;
    const container = document.getElementById('containerNivelSaida');
    const grafico = document.getElementById('graficoCombustivelSaida');
    const texto = document.getElementById('textoNivelSaida');

    if (!vNome) {
        container.style.display = 'none';
        return;
    }

    // Inicia estado de busca
    container.style.display = 'block';
    grafico.innerHTML = "";
    texto.innerText = "Consultando Firebase...";

    // Busca a última viagem concluída deste veículo
    database.ref('viagens')
        .orderByChild('veiculo')
        .equalTo(vNome)
        .limitToLast(10) 
        .once('value', (snap) => {
            let nivelEncontrado = 0;

            if (snap.exists()) {
                const dados = Object.values(snap.val());
                // Pega a última que foi finalizada (tem kmRetorno ou nivelCombustivel)
                const ultimaConcluida = dados.reverse().find(v => v.status === 'concluido' && v.nivelCombustivel !== undefined);
                
                if (ultimaConcluida) {
                    nivelEncontrado = parseInt(ultimaConcluida.nivelCombustivel);
                }
            }

            // Desenha os 12 palitos do gráfico
            grafico.innerHTML = ""; 
            for (let i = 1; i <= 12; i++) {
                const palito = document.createElement('div');
                palito.style.flex = "1";
                palito.style.height = "12px";
                palito.style.borderRadius = "2px";
                
                if (i <= nivelEncontrado) {
                    palito.style.backgroundColor = (nivelEncontrado <= 3) ? "#ff4444" : "#28a745";
                } else {
                    palito.style.backgroundColor = "#ddd"; 
                }
                grafico.appendChild(palito);
            }

            texto.innerText = nivelEncontrado + "/12 Marcadores";
            texto.style.color = (nivelEncontrado <= 3) ? "red" : "#28a745";
        });
};

    // Eventos internos do modal criado
    document.getElementById('motivoSelecao').onchange = function() {
        document.getElementById('camposEntrega').style.display = (this.value === 'entrega') ? 'block' : 'none';
        document.getElementById('camposOutros').style.display = (this.value === 'outros') ? 'block' : 'none';
    };

    document.getElementById('btnCancelarSaida').onclick = () => fecharModalSaida();
    document.getElementById('btnExecutarLancar').onclick = () => processarLancarSaida(tempo);
}

function fecharModalSaida() {
    const m = document.getElementById('modalSaida');
    if(m) m.remove(); // Remove o elemento do DOM completamente
}

// 4. LÓGICA DE PROCESSAMENTO (SAÍDA)
function processarLancarSaida(tempo) {
    const veiculo = document.getElementById('placaVeiculo').value;
    const km = parseFloat(document.getElementById('kmSaida').value);
    const motorista = document.getElementById('selectMotorista').value;

    if(!veiculo || !km || !motorista) return alert("Erro: Preencha todos os campos!");

    database.ref('viagens').once('value', (snap) => {
        let emTrânsito = false;
        let ultimoKm = 0;

        snap.forEach((child) => {
            const v = child.val();
            if (v.veiculo === veiculo && v.status === 'em_transito') emTrânsito = true;
            if (v.veiculo === veiculo && v.status === 'concluido') {
                if (parseFloat(v.kmRetorno) > ultimoKm) ultimoKm = parseFloat(v.kmRetorno);
            }
        });

        if (emTrânsito) return alert("Veículo já está em trânsito!");
        if (km < ultimoKm) return alert(`KM inválido! Último registro: ${ultimoKm}`);

        const dados = {
            veiculo, motorista, kmSaida: km,
            dataSaida: tempo.data, horaSaida: tempo.hora,
            motivo: document.getElementById('motivoSelecao').value,
            nf: document.getElementById('nf').value || "",
            valorNf: document.getElementById('valorNf').value || "",
            descricaoMotivo: document.getElementById('descricaoMotivo').value || "",
            status: 'em_transito'
        };

        database.ref('viagens').push(dados).then(() => {
            alert("Sucesso!");
            fecharModalSaida();
        });
    });
}

// 5. GATILHOS DE INTERFACE
document.getElementById('btnAbrirSaida').onclick = () => criarModalSaida();

// 6. LÓGICA DE RETORNO (MODAL JÁ EXISTENTE NO HTML OU ADAPTADO)
let idAtual = "";

// Função para gerar o visual de blocos (palitos) no retorno
function renderizarSeletorCombustivel() {
    const container = document.getElementById('seletorNivelChegada');
    const txtNivel = document.getElementById('txtNivelChegada');
    const inputOculto = document.getElementById('valorNivelFinal');
    
    container.innerHTML = ""; // Limpa para evitar duplicatas

    for (let i = 1; i <= 12; i++) {
        const bloco = document.createElement('div');
        bloco.style.flex = "1";
        bloco.style.height = "12px";
        bloco.style.borderRadius = "2px";
        bloco.style.backgroundColor = "#ddd";
        bloco.style.cursor = "pointer";
        bloco.style.transition = "0.2s";

        bloco.onclick = () => {
            const nivelSelecionado = i;
            inputOculto.value = nivelSelecionado;
            txtNivel.innerText = nivelSelecionado + "/12";
            
            // Pinta os blocos selecionados
            Array.from(container.children).forEach((el, index) => {
                if (index < nivelSelecionado) {
                    el.style.backgroundColor = (nivelSelecionado <= 2) ? "#ff4444" : "#28a745";
                } else {
                    el.style.backgroundColor = "#ddd";
                }
            });
        };
        container.appendChild(bloco);
    }
}

window.abrirModal = (id, veiculo) => {
    idAtual = id;
    const tempo = atualizarDataHora();
    document.getElementById('labelVeiculoModal').innerText = veiculo;
    document.getElementById('dataRetorno').value = tempo.data;
    document.getElementById('horaRetorno').value = tempo.hora;
    document.getElementById('modalRetorno').style.display = 'flex';
    
    // Inicia o novo visual de blocos
    renderizarSeletorCombustivel();
    // Reseta valores para o novo registro
    document.getElementById('valorNivelFinal').value = 0;
    document.getElementById('txtNivelChegada').innerText = "0/12";
};

document.getElementById('btnFecharModal').onclick = () => {
    document.getElementById('modalRetorno').style.display = 'none';
};

document.getElementById('btnConfirmar').onclick = function() {
    const kmF = parseFloat(document.getElementById('kmRetorno').value);
    // Agora pegamos o valor do campo oculto preenchido pelos blocos
    const combustivel = document.getElementById('valorNivelFinal').value; 

    if (!kmF || combustivel === "0") {
        return alert("Por favor, preencha o KM final e selecione o nível de combustível!");
    }

    database.ref('viagens/' + idAtual).once('value', (snap) => {
        if (kmF < parseFloat(snap.val().kmSaida)) {
            return alert("KM de retorno inválido! Menor que o KM de saída.");
        }

        database.ref('viagens/' + idAtual).update({
            dataRetorno: document.getElementById('dataRetorno').value,
            horaRetorno: document.getElementById('horaRetorno').value,
            kmRetorno: kmF,
            nivelCombustivel: combustivel,
            status: 'concluido'
        }).then(() => {
            document.getElementById('modalRetorno').style.display = 'none';
            // Limpa o campo de KM para a próxima vez
            document.getElementById('kmRetorno').value = "";
        });
    });
};

// 7. RENDERIZAÇÃO E HISTÓRICO (FORMATO CARROSSEL)
database.ref('viagens').on('value', (snap) => {
    const cCards = document.getElementById('containerCards');
    const cHist = document.getElementById('containerHistorico');
    
    // Limpa os containers antes de renderizar
    cCards.innerHTML = ""; 
    cHist.innerHTML = "";
    
    snap.forEach((child) => {
        const v = child.val();
        // Formata a data de Saída (DD/MM) para economizar espaço no card
        const dataS = v.dataSaida.split('-').reverse().slice(0, 2).join('/');
        
        if(v.status === 'em_transito') {
            const div = document.createElement('div');
            div.className = 'card-viagem';
            div.innerHTML = `
                <div>
                    <h4>${v.veiculo}</h4>
                    <p>👤 <b>${v.motorista}</b></p> <p>🕒 Saída: ${dataS} - ${v.horaSaida}</p>
                    <p>📍 KM Inicial: ${v.kmSaida}</p>
                    ${v.nf ? `<p><b>NF:</b> ${v.nf} (R$ ${v.valorNf})</p>` : ''}
                    ${v.descricaoMotivo ? `<p><b>Obs:</b> ${v.descricaoMotivo}</p>` : ''}
                </div>
                <button class="btn-principal" onclick="abrirModal('${child.key}', '${v.veiculo}')">FINALIZAR</button>
            `;
            cCards.appendChild(div);
        } else {
            const divH = document.createElement('div');
            divH.className = 'card-historico';
            // Formata a data de Retorno (DD/MM)
            const dataR = v.dataRetorno ? v.dataRetorno.split('-').reverse().slice(0, 2).join('/') : "";
            const kmTotal = v.kmRetorno - v.kmSaida;

            divH.innerHTML = `
                <h4>${v.veiculo}</h4>
                <p>👤 ${v.motorista}</p>
                <p>📅 ${dataS} ➔ ${dataR}</p>
                <p>📈<b>Saída:</b> ${dataS} às ${v.horaSaida} (${v.kmSaida} KM)</p>
                <p>📈<b>Chegada:</b> ${dataR} às ${v.horaRetorno} (${v.kmRetorno} KM)</p>                
                ${v.nf ? `<p><b>NF:</b> ${v.nf} (R$ ${v.valorNf})</p>` : ''}
                ${v.descricaoMotivo ? `<p><b>Obs:</b> ${v.descricaoMotivo}</p>` : ''}
            `;
            // O prepend garante que o histórico mais recente fique na primeira posição (esquerda) do carrossel
            cHist.prepend(divH);
        }
    });
});

// 8. EXCEL
document.getElementById('btnExportar').onclick = function() {
    database.ref('viagens').once('value', (snap) => {
        const excelData = [];
        snap.forEach(c => {
            const d = c.val();
            if(d.status === 'concluido') excelData.push({ Veiculo: d.veiculo, Motorista: d.motorista, Saida: d.dataSaida, KM_Ini: d.kmSaida, Chegada: d.dataRetorno, KM_Fin: d.kmRetorno, Total: d.kmRetorno - d.kmSaida });
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Viagens");
        XLSX.writeFile(wb, "Relatorio_KM.xlsx");
    });
};

// --- MODAL DE ABASTECIMENTO (DINÂMICO) ---

document.getElementById('btnAbrirAbastecimento').onclick = () => criarModalAbastecimento();

function criarModalAbastecimento() {
    const tempo = atualizarDataHora();
    const dataFormatada = tempo.data.split('-').reverse().join('/');

    const modalHtml = `
        <div id="modalAbastecimento" class="modal" style="display: flex;">
            <div class="modal-content">
                <h3 style="color: #28a745;">⛽ REGISTRAR ABASTECIMENTO</h3>
                <button id="btnVerHistoricoAbs" style="background: none; border: 1px solid #28a745; color: #28a745; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem;">📋 HISTÓRICO</button>
                <div class="grupo-input">
                    <label>Data</label>
                    <input type="text" value="${dataFormatada}" class="input-destaque-verde" readonly>
                </div>

                <div class="grupo-input">
                    <label>Veículo</label>
                    <select id="absVeiculo">
                        <option value="">Selecione o Veículo</option>
                        <option value="Argo RVX0F35">Argo RVX0F35</option>
                        <option value="Argo RVX0F37">Argo RVX0F37</option>
                        <option value="Ducato PYI2E43">Ducato PYI2E43</option>
                    </select>
                </div>

                <div class="grupo-input">
                    <label>Combustivel</label>
                    <select id="tipocombustivel">
                        <option value="">Selecione o Combustivel</option>
                        <option value="Gasolina Comum">Gasolina Comum</option>
                        <option value="Etanol">Etanol</option>
                        <option value="Diesel S10">Diesel S10</option>
                    </select>
                </div>

                <div class="grupo-input">
                    <label>Litros (Qtd)</label>
                    <input type="number" id="absLitros" step="0.01" placeholder="Ex: 45.50">
                </div>

                <div class="grupo-input">
                    <label>Valor Total (R$)</label>
                    <input type="number" id="absValor" step="0.01" placeholder="Ex: 250.00">
                </div>

                <div class="grupo-input">
                    <label>Quilometragem no Ato</label>
                    <input type="number" id="absKm" placeholder="KM atual do painel">
                </div>

                <button type="button" class="btn-principal" id="btnSalvarAbastecimento" style="background-color: #28a745;">SALVAR REGISTRO</button>
                <button class="btn-secundario" id="btnCancelarAbastecimento">CANCELAR</button>
            </div>
        </div>
    `;   

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('btnVerHistoricoAbs').onclick = () => criarModalListaAbastecimentos();

    // Eventos do Modal
    document.getElementById('btnCancelarAbastecimento').onclick = () => document.getElementById('modalAbastecimento').remove();
    
    document.getElementById('btnSalvarAbastecimento').onclick = function() {
        const veiculo = document.getElementById('absVeiculo').value;
        const litros = document.getElementById('absLitros').value;
        const valor = document.getElementById('absValor').value;
        const km = document.getElementById('absKm').value;
        const combustivel = document.getElementById('tipocombustivel').value;

        if(!veiculo || !combustivel || !litros || !valor || !km) {
            return alert("Por favor, preencha todos os dados do abastecimento.");
        }

        const dadosAbs = {
            veiculo,
            combustivel,
            litros: parseFloat(litros),
            valorTotal: parseFloat(valor),
            kmAtual: parseInt(km),
            data: tempo.data,
            hora: tempo.hora
        };

        // Salva em uma nova coleção no Firebase
        database.ref('abastecimentos').push(dadosAbs).then(() => {
            alert("Abastecimento registrado com sucesso!");
            document.getElementById('modalAbastecimento').remove();
        });
    };
}

function criarModalListaAbastecimentos() {
    const modalListaHtml = `
        <div id="modalListaAbs" class="modal" style="display: flex; z-index: 1001;">
            <div class="modal-content">
                <h3 style="color: #28a745; text-align: center;">HISTÓRICO DE ABASTECIMENTOS</h3>
                
                <div id="listaAbsCards" class="carrossel-modal">
                    <p>Carregando registros...</p>
                </div>
                
                <button class="btn-secundario" id="btnFecharListaAbs">VOLTAR</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalListaHtml);
    const containerLista = document.getElementById('listaAbsCards');

    database.ref('abastecimentos').orderByChild('data').limitToLast(15).once('value', (snap) => {
        containerLista.innerHTML = "";
        
        if (!snap.exists()) {
            containerLista.innerHTML = "<p>Nenhum registro encontrado.</p>";
            return;
        }

        snap.forEach((child) => {
            const a = child.val();
            const dataF = a.data.split('-').reverse().slice(0, 2).join('/');
            
            const cardAbs = `
                <div class="card-abs-item">
                    <div>
                        <h4>${a.veiculo}</h4>
                        <p>📅 Data: ${dataF}</p>
                        <p>⛽ Qtd: <b>${a.litros}L</b></p>
                        <p>📈 KM: ${a.kmAtual}</p>
                        <p style="color: #28a745; font-weight: bold; font-size: 1.1rem; margin-top: 8px;">
                           R$ ${parseFloat(a.valorTotal).toFixed(2)}
                        </p>
                    </div>
                </div>
            `;
            // Prepend para o mais recente ficar na esquerda
            containerLista.insertAdjacentHTML('afterbegin', cardAbs);
        });
    });

    document.getElementById('btnFecharListaAbs').onclick = () => document.getElementById('modalListaAbs').remove();
}

// Injeção da estrutura completa (Modal + Lista) via JavaScript
const areaAgendamento = document.getElementById('areaAgendamentoDinamica');
areaAgendamento.innerHTML = `
    <div id="modalAgendamento" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>Novo Agendamento</h3>
            
            <div class="grupo-input">
                <label>Motorista</label>
                <select id="agendarMotorista">
                    <option value="">Quem vai dirigir?</option>
                    <option value="Marcelo Motta Cardoso">Marcelo Motta Cardoso</option>
                    <option value="Daniela Claudia">Daniela Claudia</option>
                    <option value="Gabriel Louid Da Cunha Porto">Gabriel Louid da Cunha Porto</option>
                    <option value="Carlos Eduardo de Faria">Carlos Eduardo de Faria</option>
                    <option value="Gracy Theodoro Junior">Gracy Theodoro Junior</option>
                    <option value="Grace Melody Maciel">Grace Melody Maciel</option>
                    <option value="Ricardo Marçal da Silva">Ricardo Marçal da Silva</option>
                    <option value="Roberto Assis Silva">Roberto Assis Silva</option>
                    <option value="Eduardo de souza diniz">Eduardo de souza diniz</option>
                    <option value="Cibely Carvalho de Lucas">Cibely Carvalho de Lucas</option>
                </select>
            </div>

            <div class="grupo-input">
                <label>Veículo</label>
                <select id="agendarVeiculo">
                    <option value="">Selecione o Veículo</option>
                    <option value="Argo RVX0F35">Argo RVX0F35</option>
                    <option value="Argo RVX0F37">Argo RVX0F37</option>
                    <option value="Ducato PYI2E43">Ducato PYI2E43</option>
                </select>
            </div>

            <div class="grupo-input">
                <label>Data e Hora</label>
                <div class="linha-dupla">
                    <input type="date" id="dataAgendada">
                    <input type="time" id="horaAgendada">
                </div>
            </div>

            <div class="grupo-input">
                <label>Duração Estimada (Horas)</label>
                <input type="number" id="tempoEstimado" placeholder="Ex: 3">
            </div>

            <button class="btn-principal" id="btnSalvarAgendamento">CONFIRMAR RESERVA</button>
            <button class="btn-secundario" id="btnFecharModalAgendamento">CANCELAR</button>
        </div>
    </div>
    <div class="divisor"></div>
    <h3>Quadro de Reservas (Próximas Saídas)</h3>
    <div id="listaAgendamentos"></div>
`;

// Controles de abertura e fechamento do Modal
document.getElementById('btnAbrirAgendamento').onclick = () => {
    document.getElementById('modalAgendamento').style.display = 'flex';
};

document.getElementById('btnFecharModalAgendamento').onclick = () => {
    document.getElementById('modalAgendamento').style.display = 'none';
};

// Gravação da Reserva no Firebase
document.getElementById('btnSalvarAgendamento').onclick = function() {
    const motorista = document.getElementById('agendarMotorista').value;
    const veiculo = document.getElementById('agendarVeiculo').value;
    const data = document.getElementById('dataAgendada').value;
    const hora = document.getElementById('horaAgendada').value;
    const tempo = document.getElementById('tempoEstimado').value;

    if (!motorista || !veiculo || !data || !hora) {
        return alert("Erro: Preencha todos os campos para agendar!");
    }

    database.ref('agendamentos').push({
        motorista, 
        veiculo, 
        data, 
        hora, 
        tempoEstimado: tempo, 
        status: 'reservado'
    }).then(() => {
        alert("Veículo reservado com sucesso!");
        document.getElementById('modalAgendamento').style.display = 'none';
        // Limpar campos internos
        document.getElementById('agendarMotorista').value = "";
        document.getElementById('agendarVeiculo').value = "";
    });
};

// Monitoramento e Listagem das Reservas em Formato Carrossel
database.ref('agendamentos').on('value', (snapshot) => {
    const container = document.getElementById('listaAgendamentos');
    container.innerHTML = "";
    
    if (!snapshot.exists()) {
        container.innerHTML = "<p style='color:#777; padding:10px;'>Nenhuma reserva para os próximos dias.</p>";
        return;
    }

    snapshot.forEach((child) => {
        const ag = child.val();
        const card = document.createElement('div');
        
        // Usando a nova classe de carrossel
        card.className = 'card-reserva-carrossel'; 
        
        card.innerHTML = `
            <h4>${ag.veiculo}</h4>
            <p style="margin: 5px 0;"><b>👤 Motorista:</b> ${ag.motorista}</p>
            <p style="margin: 5px 0;"><b>📅 Data:</b> ${ag.data.split('-').reverse().join('/')}</p>
            <p style="margin: 5px 0;"><b>⏰ Hora:</b> ${ag.hora} (${ag.tempoEstimado}h de uso)</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">
            <button onclick="excluirAgendamento('${child.key}')" 
                style="color:red; background:none; border:none; cursor:pointer; font-weight:bold; width:100%; text-align:center;">
                CANCELAR RESERVA
            </button>
        `;
        // Adiciona ao final para manter ordem cronológica se desejar, ou use prepend para as mais recentes
        container.appendChild(card);
    });
});

window.excluirAgendamento = (id) => {
    if(confirm("Deseja realmente excluir este agendamento?")) {
        database.ref('agendamentos/' + id).remove();
    }
};



