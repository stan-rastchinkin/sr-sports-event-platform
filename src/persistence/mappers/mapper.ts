export interface Mapper<Domain, Persistence> {
  toDomain(persistence: Persistence): Domain;
  toPersistence(domain: Domain): Persistence;
}
