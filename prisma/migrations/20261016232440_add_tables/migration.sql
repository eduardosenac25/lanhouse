-- CreateTable
CREATE TABLE `jogadores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(40) NOT NULL,
    `nick` VARCHAR(20) NOT NULL,
    `email` VARCHAR(60) NOT NULL,
    `obs` TEXT NULL,
    `saldo` DECIMAL(9, 2) NOT NULL DEFAULT 0,

    UNIQUE INDEX `jogadores_nick_key`(`nick`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(20) NOT NULL,
    `tipo` VARCHAR(15) NOT NULL,
    `valorHora` DECIMAL(9, 2) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'livre',

    UNIQUE INDEX `estacoes_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogadorId` INTEGER NOT NULL,
    `estacaoId` INTEGER NOT NULL,
    `horas` DECIMAL(4, 1) NOT NULL,
    `preco` DECIMAL(9, 2) NOT NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recargas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogadorId` INTEGER NOT NULL,
    `valor` DECIMAL(9, 2) NOT NULL,
    `tipo` VARCHAR(10) NOT NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessoes` ADD CONSTRAINT `sessoes_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `jogadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessoes` ADD CONSTRAINT `sessoes_estacaoId_fkey` FOREIGN KEY (`estacaoId`) REFERENCES `estacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recargas` ADD CONSTRAINT `recargas_jogadorId_fkey` FOREIGN KEY (`jogadorId`) REFERENCES `jogadores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
