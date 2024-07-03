document.addEventListener('DOMContentLoaded', () => {
    const tableList = document.getElementById('tables');
    const detailsDiv = document.getElementById('details');
    const checkDuplicatesButton = document.getElementById('check-duplicates');
    const filterSelect = document.getElementById('filter-select');
    const jsonFileInput = document.getElementById('json-file');
    const destinationJsonFileInput = document.getElementById('origin-json-file'); // Renomeado para "destinationJsonFileInput"

    let originTables = []; // Renomeado para "originTables"
    let destinationData = {}; // Renomeado para "destinationData"

    jsonFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const jsonData = await readJSONFile(file);
            originTables = jsonData;
            console.log("Origin tables from JSON:", originTables);
            renderTableList(originTables);
        }
    });

    destinationJsonFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            destinationData = await readJSONFile(file);
            console.log("Destination data from JSON:", destinationData);
            renderTableList(originTables); // Re-render list to apply any new filters
        }
    });

    function readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    function renderTableList(filteredTables) {
        tableList.innerHTML = '';
        filteredTables.forEach(table => {
            const li = document.createElement('li');
            li.textContent = table.name;
            li.addEventListener('click', () => {
                showTableDetails(table);
            });
            tableList.appendChild(li);
        });
    }

    filterSelect.addEventListener('change', () => {
        const filterValue = filterSelect.value;
        console.log("Selected filter:", filterValue);
        let filteredTables = originTables;

        if (filterValue === 'no-pk') {
            filteredTables = originTables.filter(table => table.primaryKey.length === 0);
        } else if (filterValue === 'no-synapse') {
            filteredTables = originTables.filter(table => !destinationData[table.name.toUpperCase()]);
        } else if (filterValue === 'in-synapse') {
            filteredTables = originTables.filter(table => destinationData[table.name.toUpperCase()]);
        } else if (filterValue === 'no-synapse-no-pk') {
            filteredTables = originTables.filter(table => !destinationData[table.name.toUpperCase()] && table.primaryKey.length === 0);
        } else if (filterValue === 'in-synapse-no-pk') {
            filteredTables = originTables.filter(table => destinationData[table.name.toUpperCase()] && table.primaryKey.length === 0);
        }

        console.log("Filtered tables:", filteredTables);
        renderTableList(filteredTables);
    });

    checkDuplicatesButton.addEventListener('click', () => {
        const duplicates = findDuplicateColumns(originTables);
        console.log("Duplicate columns:", duplicates);
        showDuplicateColumns(duplicates);
    });

    function showTableDetails(table) {
        console.log("Showing details for table:", table.name);
        detailsDiv.innerHTML = `
            <div class="table-info">
                <h3>Informações Estruturais</h3>
                <p><strong>Nome da Tabela:</strong> ${table.name}</p>
                <p><strong>Esquema:</strong> ${table.schema}</p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tipo de Dados</th>
                        <th>Tamanho/Precisão</th>
                        <th>Valor Padrão</th>
                        <th>Restrições</th>
                    </tr>
                    ${table.columns.map(col => `
                    <tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.size}</td>
                        <td>${col.default}</td>
                        <td>${col.constraints}</td>
                    </tr>`).join('')}
                </table>
                <p><strong>Chave Primária:</strong></p>
                <table>
                    <tr>
                        <th>Coluna</th>
                    </tr>
                    ${table.primaryKey.map(pk => `
                    <tr>
                        <td>${pk.column}</td>
                    </tr>`).join('')}
                </table>
                <p><strong>Índices:</strong></p>
                <table>
                    <tr>
                        <th>Nome do Índice</th>
                        <th>Colunas</th>
                    </tr>
                    ${table.indexes.map(index => `
                    <tr>
                        <td>${index.name}</td>
                        <td>${index.columns.join(', ')}</td>
                    </tr>`).join('')}
                </table>
                <p><strong>Chaves Estrangeiras:</strong></p>
                <table>
                    <tr>
                        <th>Coluna</th>
                        <th>Tabela Estrangeira</th>
                        <th>Coluna Estrangeira</th>
                    </tr>
                    ${table.foreignKeys.map(fk => `
                    <tr>
                        <td>${fk.column}</td>
                        <td>${fk.foreignTable}</td>
                        <td>${fk.foreignColumn}</td>
                    </tr>`).join('')}
                </table>
                <p><strong>Restrições:</strong></p>
                <table>
                    <tr>
                        <th>Nome</th>
                        <th>Coluna</th>
                        <th>Tipo</th>
                    </tr>
                    ${table.constraints.map(constraint => `
                    <tr>
                        <td>${constraint.name}</td>
                        <td>${constraint.column}</td>
                        <td>${constraint.type}</td>
                    </tr>`).join('')}
                </table>
                <p><strong>Triggers:</strong></p>
                <table>
                    <tr>
                        <th>Esquema</th>
                        <th>Nome</th>
                        <th>Evento</th>
                        <th>Timing</th>
                        <th>Statement</th>
                    </tr>
                    ${table.triggers.map(trigger => `
                    <tr>
                        <td>${trigger.schema}</td>
                        <td>${trigger.name}</td>
                        <td>${trigger.event}</td>
                        <td>${trigger.timing}</td>
                        <td>${trigger.statement}</td>
                    </tr>`).join('')}
                </table>
                <button class="compare-button" data-table-name="${table.name}">Comparar Ambiente</button>
            </div>
            <div class="table-info">
                <h3>Informações de Conteúdo</h3>
                <p><strong>Número de Registros:</strong> ${table.recordCount}</p>
                <!-- Conteúdo dos registros pode ser adicionado aqui -->
            </div>
        `;

        document.querySelector('.compare-button').addEventListener('click', () => {
            const differences = compareEnvironments(table);
            console.log("Differences for table", table.name, differences);
            showEnvironmentDifferences(table.name, differences);
        });
    }

    function findDuplicateColumns(tables) {
        const columnTables = {};
        tables.forEach(table => {
            table.columns.forEach(col => {
                const colName = col.name.toUpperCase();
                if (!columnTables[colName]) {
                    columnTables[colName] = [];
                }
                columnTables[colName].push(table.name);
            });
        });
        const duplicates = {};
        for (const colName in columnTables) {
            if (columnTables[colName].length > 1) {
                duplicates[colName] = columnTables[colName];
            }
        }
        return duplicates;
    }

    function showDuplicateColumns(duplicates) {
        detailsDiv.innerHTML = `
            <div class="table-info">
                <h3>Colunas Duplicadas</h3>
                ${Object.keys(duplicates).length > 0 ? `
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tabelas</th>
                    </tr>
                    ${Object.entries(duplicates).map(([col, tables]) => `
                    <tr>
                        <td>${col}</td>
                        <td>${tables.join(', ')}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma coluna duplicada encontrada.</p>`}
            </div>
        `;
    }

    function compareEnvironments(table) {
        console.log("Comparing environments for table:", table.name);
        const destinationTable = destinationData[table.name.toUpperCase()];
        console.log("Destination table data:", destinationTable);

        if (!destinationTable) {
            console.log("Table not found in destination data:", table.name.toUpperCase());
            return {
                missingInDestination: [],
                extraInDestination: table.columns.map(col => ({ ...col, name: col.name.toUpperCase() })),
                mismatched: []
            };
        }

        const originColumns = table.columns.map(col => ({ ...col, name: col.name.toUpperCase() }));
        const destinationColumns = destinationTable.map(col => ({ ...col, name: col.name.toUpperCase() }));

        console.log("Origin columns:", originColumns);
        console.log("Destination columns:", destinationColumns);

        const differences = {
            missingInDestination: [],
            extraInDestination: [],
            mismatched: []
        };

        originColumns.forEach(originCol => {
            const destinationCol = destinationColumns.find(destinationCol => destinationCol.name === originCol.name);
            if (!destinationCol) {
                differences.missingInDestination.push(originCol);
            } else if (
                destinationCol.type !== originCol.type ||
                destinationCol.size !== originCol.size ||
                destinationCol.default !== originCol.default ||
                destinationCol.constraints !== originCol.constraints
            ) {
                differences.mismatched.push({
                    origin: originCol,
                    destination: destinationCol
                });
            }
        });

        destinationColumns.forEach(destinationCol => {
            if (!originColumns.some(originCol => originCol.name === destinationCol.name)) {
                differences.extraInDestination.push(destinationCol);
            }
        });

        return differences;
    }

    function showEnvironmentDifferences(tableName, differences) {
        console.log("Showing differences for table:", tableName);
        detailsDiv.innerHTML = `
            <div class="table-info">
                <h3>Diferenças entre Origem e Destino para ${tableName}</h3>
                ${differences.missingInDestination.length > 0 ? `
                <p><strong>Faltando no Destino:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tipo de Dados</th>
                        <th>Tamanho/Precisão</th>
                        <th>Valor Padrão</th>
                        <th>Restrições</th>
                    </tr>
                    ${differences.missingInDestination.map(col => `
                    <tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.size}</td>
                        <td>${col.default}</td>
                        <td>${col.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma coluna faltando no Destino.</p>`}
                ${differences.extraInDestination.length > 0 ? `
                <p><strong>Extra no Destino:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tipo de Dados</th>
                        <th>Tamanho/Precisão</th>
                        <th>Valor Padrão</th>
                        <th>Restrições</th>
                    </tr>
                    ${differences.extraInDestination.map(col => `
                    <tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.size}</td>
                        <td>${col.default}</td>
                        <td>${col.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma coluna extra no Destino.</p>`}
                ${differences.mismatched.length > 0 ? `
                <p><strong>Colunas com discrepâncias:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Origem</th>
                        <th>Destino</th>
                    </tr>
                    ${differences.mismatched.map(diff => `
                    <tr>
                        <td>${diff.origin.name}</td>
                        <td>${diff.origin.type}${diff.origin.size ? `(${diff.origin.size})` : ''}, default: ${diff.origin.default}, constraints: ${diff.origin.constraints}</td>
                        <td>${diff.destination.type}${diff.destination.size ? `(${diff.destination.size})` : ''}, default: ${diff.destination.default}, constraints: ${diff.destination.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma discrepância encontrada.</p>`}
            </div>
        `;
    }
});
