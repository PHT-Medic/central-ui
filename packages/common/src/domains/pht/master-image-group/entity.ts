/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column,
    CreateDateColumn,
    Entity, Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

@Entity({name: 'master_image_groups'})
export class MasterImageGroup {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({type: 'varchar', length: 128})
    name: string;

    @Column({type: 'varchar', length: 512})
    path: string;

    @Index({unique: true})
    @Column({type: 'varchar', length: 256})
    virtual_path: string;

    // ------------------------------------------------------------------

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
