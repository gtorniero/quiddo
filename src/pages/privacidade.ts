import type { Page } from '../main';
import { showConsent } from '../lib/measurement';

export function page(): Page {
  return {
    title: 'Privacidade',
    mount(main) {
      main.innerHTML = `<article class="panel prose"><h1>Privacidade no Quiddo</h1><p>Atualizado em 6 de novembro de 2026.</p>
        <p>O Quiddo é um produto da Beyond the Work. Contato: <a href="mailto:oi@quiddo.com.br">oi@quiddo.com.br</a>.</p>
        <h2>Dados para o jogo funcionar</h2><p>Seus quizzes e preferências ficam neste navegador. Ao abrir uma sala, enviamos ao serviço as perguntas, imagens, a marca escolhida e as respostas necessárias para o jogo. Apelidos, personagens, respostas e pontuação são usados para exibir a rodada aos participantes. Não há cadastro obrigatório para jogar.</p>
        <h2>Pagamentos</h2><p>Quando disponíveis, os pagamentos usam Stripe (cartão) e Mercado Pago (Pix). O e-mail e os dados da compra são usados para confirmar o pagamento e recuperar o acesso. Não enviamos e-mail, código de acesso, referência original do pagamento ou dados bancários às tags de medição. Compras reais confirmadas podem enviar um identificador irreversível para evitar duplicações, plano, valor e moeda.</p>
        <h2>Medição opcional e anúncios</h2><p>Com sua autorização, usamos Google Analytics para medir visitas às páginas públicas, abertura de salas, início de checkout e compras confirmadas. Com aceite para as etapas de uso, também medimos navegação, criação e salvamento de quizzes, entrada em partidas, início e término do jogo, registro de respostas e resultados de geração por IA, quando disponível. Aceites anteriores não habilitam automaticamente essa medição adicional. Se você permitir publicidade, usamos o Pixel da Meta para avaliar essas ações. Google e Meta podem receber identificadores do navegador e informações técnicas, como IP e dispositivo, e processar dados em outros países conforme suas políticas.</p>
        <p>As tags não recebem nomes de jogadores, códigos de sala, perguntas, respostas ou conteúdo de formulários. Não carregamos essas tags nas telas da sala e dos jogadores. Os endereços enviados à medição incluem apenas caminhos públicos e rótulos de campanha ou identificadores de clique válidos, sem fragmentos ou códigos privados. Simulações de checkout não são registradas como vendas.</p>
        <p>Você pode recusar cookies opcionais e continuar usando o jogo. Suas escolhas valem por até 180 dias e podem ser alteradas a qualquer momento no rodapé. Ao revogar, interrompemos novas coletas opcionais e removemos os cookies opcionais acessíveis ao site; dados anteriormente recebidos pelos fornecedores não são apagados automaticamente.</p>
        <button type="button" class="btn sec" id="privacy-edit">Alterar minhas escolhas</button>
        <p>Com seu novo aceite para medição de anúncios, a confirmação da compra também pode ser enviada pelo nosso servidor à Meta: identificador irreversível da transação, valor e moeda, identificadores de publicidade permitidos e hash SHA-256 do e-mail para correspondência. Hash é pseudonimização, não anonimização. O e-mail em texto aberto, dados do cartão, códigos de acesso, respostas e relatórios não são enviados. Recusar não impede a compra. Ao revogar, cancelamos envios pendentes quando recebemos a revogação; eventos já enviados não são apagados automaticamente. Dados da fila e correspondência são removidos em até sete dias; o registro mínimo de envio evita duplicação.</p><h2>Contato e seus direitos</h2><p>Para solicitar informações, acesso, correção ou exclusão de dados pessoais, escreva para <a href="mailto:oi@quiddo.com.br">oi@quiddo.com.br</a>. Evite enviar dados bancários ou senhas por e-mail.</p>
        <p>Políticas dos fornecedores: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google</a> e <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Meta</a>.</p></article>`;
      const button = main.querySelector<HTMLButtonElement>('#privacy-edit')!;
      button.addEventListener('click', showConsent);
      return () => button.removeEventListener('click', showConsent);
    },
  };
}
