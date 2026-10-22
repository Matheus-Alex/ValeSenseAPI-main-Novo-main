CREATE TABLE usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(20) UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT chk_usuario_perfil
        CHECK (perfil IN ('PRODUTOR_EXPORTADOR', 'ANALISTA_DADOS', 'ADMINISTRADOR')),
    CONSTRAINT chk_usuario_status
        CHECK (status IN ('ATIVO', 'INATIVO'))
);

INSERT INTO usuario (id, nome, email, cpf, senha, perfil, status)
SELECT
    id,
    name,
    email,
    document,
    password_hash,
    CASE role::text WHEN 'ADMIN' THEN 'ADMINISTRADOR' ELSE 'ANALISTA_DADOS' END,
    CASE status::text WHEN 'ACTIVE' THEN 'ATIVO' ELSE 'INATIVO' END
FROM users;

CREATE TABLE token_recuperacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expiracao TIMESTAMP NOT NULL,
    CONSTRAINT fk_token_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE
);

INSERT INTO token_recuperacao (usuario_id, token_hash, expiracao)
SELECT user_id, token_hash, expires_at
FROM password_reset_tokens
WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP;

CREATE TABLE propriedade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    nome VARCHAR(100) NOT NULL,
    area_total DECIMAL(10,2) NOT NULL,
    localizacao VARCHAR(200) NOT NULL,
    unidade_area VARCHAR(20) NOT NULL,
    CONSTRAINT fk_propriedade_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_propriedade_area CHECK (area_total > 0)
);

CREATE TABLE talhao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    propriedade_id UUID NOT NULL,
    nome VARCHAR(100) NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    unidade_area VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT fk_talhao_propriedade
        FOREIGN KEY (propriedade_id)
        REFERENCES propriedade(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_talhao_area CHECK (area > 0),
    CONSTRAINT chk_talhao_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE TABLE sensor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talhao_id UUID NOT NULL,
    identificador VARCHAR(50) NOT NULL UNIQUE,
    canal_thingspeak VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT fk_sensor_talhao
        FOREIGN KEY (talhao_id)
        REFERENCES talhao(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_sensor_status CHECK (status IN ('ATIVO', 'INATIVO', 'MANUTENCAO'))
);

CREATE TABLE leitura_climatica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID NOT NULL,
    temperatura DECIMAL(5,2) NOT NULL,
    umidade DECIMAL(5,2) NOT NULL,
    data_hora TIMESTAMP NOT NULL,
    CONSTRAINT fk_leitura_sensor
        FOREIGN KEY (sensor_id)
        REFERENCES sensor(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_leitura_umidade CHECK (umidade >= 0 AND umidade <= 100)
);

CREATE TABLE dado_mercado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto VARCHAR(100) NOT NULL,
    data_referencia DATE NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    demanda VARCHAR(30),
    unidade_preco VARCHAR(30),
    CONSTRAINT chk_dado_mercado_preco CHECK (preco >= 0)
);

CREATE TABLE previsao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talhao_id UUID NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    gerada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confianca DECIMAL(5,2),
    CONSTRAINT fk_previsao_talhao
        FOREIGN KEY (talhao_id)
        REFERENCES talhao(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_previsao_tipo CHECK (tipo IN ('COLHEITA', 'EXPORTACAO')),
    CONSTRAINT chk_previsao_confianca CHECK (confianca IS NULL OR (confianca >= 0 AND confianca <= 100)),
    CONSTRAINT chk_previsao_datas CHECK (data_fim >= data_inicio)
);

CREATE TABLE alerta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previsao_id UUID NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    mensagem TEXT NOT NULL,
    nivel VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alerta_previsao
        FOREIGN KEY (previsao_id)
        REFERENCES previsao(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_alerta_nivel CHECK (nivel IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
    CONSTRAINT chk_alerta_status CHECK (status IN ('PENDENTE', 'LIDO', 'RESOLVIDO'))
);

CREATE TABLE notificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    alerta_id UUID NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notificacao_alerta
        FOREIGN KEY (alerta_id)
        REFERENCES alerta(id)
        ON DELETE CASCADE
);

CREATE TABLE configuracao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    chave VARCHAR(100) NOT NULL,
    valor TEXT,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_configuracao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_configuracao_usuario_chave UNIQUE (usuario_id, chave)
);

CREATE TABLE log_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    acao VARCHAR(50) NOT NULL,
    endereco_ip VARCHAR(45),
    user_agent VARCHAR(255),
    resultado VARCHAR(20) NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_log_resultado CHECK (resultado IN ('SUCESSO', 'FALHA'))
);

CREATE INDEX leitura_climatica_data_hora_idx ON leitura_climatica(data_hora);
CREATE INDEX dado_mercado_produto_data_referencia_idx ON dado_mercado(produto, data_referencia);
CREATE INDEX token_recuperacao_usuario_id_idx ON token_recuperacao(usuario_id);
CREATE INDEX log_acesso_data_hora_idx ON log_acesso(data_hora);

DROP TABLE password_reset_tokens;
DROP TABLE users;
DROP TYPE "UserRole";
DROP TYPE "UserStatus";
