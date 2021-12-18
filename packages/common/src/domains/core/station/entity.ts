/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Column, CreateDateColumn, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { ProposalStation } from '../proposal-station';
import { Realm } from '../../auth';
import { TrainStation } from '../train-station';
import { createNanoID } from '../../../utils/nanoid';

@Entity({ name: 'stations' })
export class Station {
    @PrimaryGeneratedColumn()
        id: number;

    @Index()
    @Column({
        type: 'varchar', length: 100, select: false, default: createNanoID(),
    })
        secure_id: string;

    @Column({ type: 'varchar', length: 128 })
        name: string;

    @Column({ type: 'text', nullable: true, select: false })
        public_key: string;

    @Column({
        type: 'varchar', length: 256, nullable: true, select: false,
    })
        email: string | null;

    // ------------------------------------------------------------------

    @Column({ nullable: true, default: null, select: false })
        registry_project_id: number | null;

    @Column({ nullable: true, default: null, select: false })
        registry_project_account_name: string | null;

    @Column({
        type: 'text', nullable: true, default: null, select: false,
    })
        registry_project_account_token: string | null;

    @Column({ default: false, select: false })
        registry_project_webhook_exists: boolean;

    @Column({ default: false, select: false })
        vault_public_key_saved: boolean;

    // ------------------------------------------------------------------

    @CreateDateColumn()
        created_at: Date;

    @UpdateDateColumn()
        updated_at: Date;

    // ------------------------------------------------------------------

    @Column()
        realm_id: string;

    @OneToOne(() => Realm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'realm_id' })
        realm: Realm;

    @OneToMany(() => TrainStation, (trainStation) => trainStation.station)
        train_stations: TrainStation[];

    @OneToMany(() => ProposalStation, (proposalStation) => proposalStation.station)
        proposal_stations: ProposalStation[];
}
