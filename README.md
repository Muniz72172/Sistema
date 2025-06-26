Sistema Web da Policlínica Naval de São Pedro da Aldeia (PNSPA)
Finis Noster Curandi Ars – Missão: Contribuir para a eficiência do Sistema de Saúde da Marinha

Heráldica da PNSPA

🌐 Visão Geral
O Sistema Web da PNSPA centraliza, em ambiente Google Workspace, serviços essenciais aos usuários da Policlínica Naval de São Pedro da Aldeia. Oferece acesso seguro, rápido e responsivo a funcionalidades como login, cadastro validado, avisos dinâmicos e, mais recentemente, marcação de ônibus com fila de espera conforme fluxograma oficial do projeto.fileciteturn1file6turn1file0

✨ Funcionalidades Disponíveis
Módulo	Status	Descrição
Autenticação segura	✅	NIP + senha SHA‑256/Base64, controle de sessão via sessionStorage
Cadastro validado	✅	Verificação automática de NIP na aba ValidacaoFusma
Recuperação/Troca de senha	✅	E‑mail automático + forçar troca de senha provisória
Avisos dinâmicos	✅	Conteúdo gerenciado na aba Avisos
Marcação de Ônibus	🟡 Beta	Seleção visual de assentos, fila de espera, promoção automática (processarAlocacaoFilaDiaria)
Meus Agendamentos	✅	Consulta/cancelamento de Agendamentos e Reservas
Painel Admin Ônibus	🟡 Beta	Gerência de ConfigOnibus, assentos especiais e relatórios
Observação: toda movimentação gera logs de auditoria (ex.: LogsFilaEspera, LogsCadastro).fileciteturn1file0turn1file10

🚀 Roadmap Próximos 90 Dias
Finalizar interface de marcação de ônibus (mobile friendly).
Implementar marcação de consultas e exames conforme Carta de Serviços 2025.fileciteturn1file16
Criar dashboards administrativos em Looker Studio.
Integração opcional com Telegram/WhatsApp para alertas.
Refatorar banco para Firebase (PWA futura).
💻 Stack & Arquitetura
Google Apps Script (*.gs) – lógica de negócio.
Google Sheets – banco de dados inicial (planilha BaseUsuarios_PNSPA).
HTML5 + Bootstrap 4 – UI responsiva.
JavaScript (ES6) – utilidades e REST interno.
sessionStorage – sessão client‑side.
SHA‑256 + Base64 – criptografia.
📋 Estrutura da Planilha Principal
As abas-chave da BaseUsuarios_PNSPA já incluídas no repositório: UsuariosCadastrados, Agendamentos, Reservas, LogsFilaEspera, HistoricoUsuarios, HistoricoGeralUsuarios, Cancelamentos, ConfigOnibus, AssentosOnibus, ValidacaoFusma, AdminOnibus.fileciteturn1file10

É recomendável proteger cabeçalhos e validar tipos de dados para evitar entradas inválidas.

📂 Estrutura de Diretórios
├── html/
│   ├── login.html
│   ├── cadastro.html
│   ├── recuperar.html
│   ├── trocarSenha.html
│   ├── alterarSenhaMenu.html
│   ├── menu.html
│   ├── onibus.html
│   ├── instrucoesOnibus.html
│   ├── formularioOnibusComAcompanhante.html
│   ├── formularioOnibusSemAcompanhante.html
│   └── meusAgendamentos.html
├── scripts/
│   ├── Login.gs
│   ├── CadastroValidado.gs
│   ├── RecuperacaoSenha.gs
│   ├── MarcacaoOnibus.gs
│   ├── AdminOnibus.gs
│   ├── MeusAgendamentos.gs
│   └── Utilitarios.gs
├── docs/
│   ├── fluxogramas/
│   └── regulamentos/
└── README.md
🔑 Pré‑requisitos
Conta Google com acesso ao Google Apps Script.
Planilha BaseUsuarios_PNSPA (ID configurado em Config.gs).
E‑mail autorizado para envio pelo Apps Script.
Domínio *.mb liberado para requisições internas.
🔧 Instalação & Deploy
Clone este repositório.

No Google Drive, importe pastas html/ e scripts/ para um novo projeto Apps Script.

Ajuste SpreadsheetApp.openById('ID_DA_PLANILHA') em Config.gs.

Publique como Web App (Executar como: Me; Acesso: Qualquer usuário).

Defina gatilhos:

processarAlocacaoFilaDiaria – diária 00:30.
limparSessoesExpiradas – a cada 6 h.
enviarAvisosDiarios – opcional 07:00.
Preencha ConfigOnibus (DATAVIAGEM, DESTINO, QTDEASSENTOS, ATIVO).

📑 Uso Rápido
Tela	Caminho	Ação
Login	/login.html	Entrar com NIP + senha
Cadastro	/cadastro.html	Registrar novo usuário
Menu	/menu.html	Acessar módulos principais
Marcar Ônibus	/onibus.html	Escolher data, assento ou entrar na fila
Meus Agendamentos	/meusAgendamentos.html	Ver/Cancelar reservas
🤝 Contribuindo
Fork e crie uma branch: git checkout -b feature/minha-feature.
Commit: git commit -m 'feat: descrição'.
Push: git push origin feature/minha-feature.
Abra um Pull Request.
Convenções
Comentários em português.
camelCase para variáveis/funções.
Funções privadas prefixo _.
🛡️ Segurança & LGPD
Criptografia SHA‑256 + Base64.
Consentimento LGPD nas telas.
Rastreabilidade total (logs e históricos).
📜 Licença
Uso interno da Marinha do Brasil; redistribuição externa requer autorização.

📬 Contato
Cargo	Nome	E‑mail
Gestor do Sistema	SG Cláudio	sg.claudio@marinha.mil.br
🚀 "Excelência no atendimento começa com sistemas robustos e seguros."
