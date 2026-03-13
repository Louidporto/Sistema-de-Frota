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

function atualizarDataHora() {
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-br').split('/').reverse().join('-');
    const hora = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
    
    if(document.getElementById('dataSaida')) document.getElementById('dataSaida').value = data;
    if(document.getElementById('horaSaida')) document.getElementById('horaSaida').value = hora;
    
    return { data, hora };
}

document.getElementById('motivoSelecao').onchange = function() {
    const val = this.value;
    document.getElementById('camposEntrega').style.display = (val === 'entrega') ? 'block' : 'none';
    document.getElementById('camposOutros').style.display = (val === 'outros') ? 'block' : 'none';
};

// --- NOVA FUNÇÃO DE LANÇAMENTO COM VERIFICAÇÕES ---
document.getElementById('btnLancar').onclick = function() {
    const tempo = atualizarDataHora();
    const veiculoSelecionado = document.getElementById('placaVeiculo').value;
    const kmInformado = parseFloat(document.getElementById('kmSaida').value);
    const motorista = document.getElementById('selectMotorista').value;

    if(!veiculoSelecionado || !kmInformado || !motorista) {
        return alert("Erro: Preencha Veículo, Motorista e KM!");
    }

    // 1. Verificar se o veículo já está em trânsito ou validar KM
    database.ref('viagens').once('value', (snapshot) => {
        let emTrânsito = false;
        let ultimoKmFinalizado = 0;

        snapshot.forEach((child) => {
            const v = child.val();
            
            // Verifica se o veículo já tem um card aberto
            if (v.veiculo === veiculoSelecionado && v.status === 'em_transito') {
                emTrânsito = true;
            }

            // Busca o maior KM finalizado para este veículo específico
            if (v.veiculo === veiculoSelecionado && v.status === 'concluido') {
                const kmF = parseFloat(v.kmRetorno);
                if (kmF > ultimoKmFinalizado) {
                    ultimoKmFinalizado = kmF;
                }
            }
        });

        // BLOQUEIO 1: Veículo já na rua
        if (emTrânsito) {
            return alert(`O veículo ${veiculoSelecionado} já possui uma viagem em aberto! Finalize a anterior primeiro.`);
        }

        // BLOQUEIO 2: KM menor que o último registro
        if (kmInformado < ultimoKmFinalizado) {
            return alert(`Erro de KM: A última viagem deste veículo terminou com ${ultimoKmFinalizado} KM. Não é permitido iniciar com um valor menor.`);
        }

        // Se passar nas duas verificações, realiza o push
        const dados = {
            veiculo: veiculoSelecionado,
            motorista: motorista,
            dataSaida: tempo.data,
            horaSaida: tempo.hora,
            kmSaida: kmInformado,
            motivo: document.getElementById('motivoSelecao').value,
            nf: document.getElementById('nf').value || "",
            valorNf: document.getElementById('valorNf').value || "",
            descricaoMotivo: document.getElementById('descricaoMotivo').value || "",
            status: 'em_transito'
        };

        database.ref('viagens').push(dados).then(() => {
            alert("Saída registrada com sucesso!");
            document.getElementById('kmSaida').value = "";
            document.getElementById('nf').value = "";
            document.getElementById('valorNf').value = "";
            document.getElementById('descricaoMotivo').value = "";
        });
    });
};

// --- RESTANTE DO CÓDIGO (MODAL E MONITORAMENTO) ---
let idAtual = "";
window.abrirModal = (id, veiculo) => {
    idAtual = id;
    const tempo = atualizarDataHora();
    document.getElementById('labelVeiculoModal').innerText = veiculo;
    document.getElementById('dataRetorno').value = tempo.data;
    document.getElementById('horaRetorno').value = tempo.hora;
    document.getElementById('modalRetorno').style.display = 'flex';
};

document.getElementById('btnFecharModal').onclick = () => document.getElementById('modalRetorno').style.display = 'none';

document.getElementById('btnConfirmar').onclick = function() {
    const kmF = parseFloat(document.getElementById('kmRetorno').value);
    
    // Verificação adicional no fechamento: KM de retorno não pode ser menor que o de saída
    database.ref('viagens/' + idAtual).once('value', (snapshot) => {
        const dadosViagem = snapshot.val();
        if (kmF < parseFloat(dadosViagem.kmSaida)) {
            return alert(`Erro: O KM de retorno (${kmF}) não pode ser menor que o KM de saída (${dadosViagem.kmSaida})!`);
        }

        database.ref('viagens/' + idAtual).update({
            dataRetorno: document.getElementById('dataRetorno').value,
            horaRetorno: document.getElementById('horaRetorno').value,
            kmRetorno: kmF,
            status: 'concluido'
        }).then(() => {
            document.getElementById('modalRetorno').style.display = 'none';
            document.getElementById('kmRetorno').value = "";
        });
    });
};

// Monitoramento para exibir os cards
database.ref('viagens').on('value', (snapshot) => {
    const containerCards = document.getElementById('containerCards');
    const containerHistorico = document.getElementById('containerHistorico');
    containerCards.innerHTML = "";
    containerHistorico.innerHTML = "";
    
    snapshot.forEach((child) => {
        const v = child.val();
        const dataS = v.dataSaida.split('-').reverse().join('/');
        
        if(v.status === 'em_transito') {
            const card = document.createElement('div');
            card.className = 'card-viagem';
            card.innerHTML = `
                <h4>${v.veiculo}</h4>
                <p><b>Motorista:</b> ${v.motorista}</p>
                <p><b>Saída:</b> ${dataS} às ${v.horaSaida}</p>
                <button class="btn-principal" onclick="abrirModal('${child.key}', '${v.veiculo}')">FINALIZAR</button>
            `;
            containerCards.appendChild(card);
        } else {
            const cardH = document.createElement('div');
            cardH.className = 'card-historico';
            const dataR = v.dataRetorno.split('-').reverse().join('/');
            const kmRodado = v.kmRetorno - v.kmSaida;
            
            cardH.innerHTML = `
                <h4>${v.veiculo}</h4>
                <p><b>Motorista:</b> ${v.motorista}</p>
                <p><b>Saída:</b> ${dataS} às ${v.horaSaida} (${v.kmSaida} KM)</p>
                <p><b>Chegada:</b> ${dataR} às ${v.horaRetorno} (${v.kmRetorno} KM)</p>
                <p><b>Total:</b> <span style="color:var(--verde)">${kmRodado} KM rodados</span></p>
                ${v.nf ? `<p><b>NF:</b> ${v.nf} (R$ ${v.valorNf})</p>` : ''}
                ${v.descricaoMotivo ? `<p><b>Obs:</b> ${v.descricaoMotivo}</p>` : ''}
            `;
            containerHistorico.prepend(cardH);
        }
    });
});

atualizarDataHora();
