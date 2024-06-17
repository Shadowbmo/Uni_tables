document.addEventListener('DOMContentLoaded', () => {
    const tableList = document.getElementById('tables');
    const detailsDiv = document.getElementById('details');
    const checkDuplicatesButton = document.getElementById('check-duplicates');
    const filterSelect = document.getElementById('filter-select');
    const jsonFileInput = document.getElementById('json-file');
    const originJsonFileInput = document.getElementById('origin-json-file');

    let tables = [];
    let originData = {};

    jsonFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const jsonData = await readJSONFile(file);
            tables = jsonData;
            renderTableList(tables);
        }
    });

    originJsonFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            originData = await readJSONFile(file);
            renderTableList(tables); // Re-render list to apply any new filters
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
        let filteredTables = tables;

        if (filterValue === 'no-pk') {
            filteredTables = tables.filter(table => table.primaryKey.length === 0);
        } else if (filterValue === 'no-synapse') {
            filteredTables = tables.filter(table => !originData[table.name.toUpperCase()]);
        } else if (filterValue === 'in-synapse') {
            filteredTables = tables.filter(table => originData[table.name.toUpperCase()]);
        } else if (filterValue === 'no-synapse-no-pk') {
            filteredTables = tables.filter(table => !originData[table.name.toUpperCase()] && table.primaryKey.length === 0);
        } else if (filterValue === 'in-synapse-no-pk') {
            filteredTables = tables.filter(table => originData[table.name.toUpperCase()] && table.primaryKey.length === 0);
        }

        renderTableList(filteredTables);
    });

    checkDuplicatesButton.addEventListener('click', () => {
        const duplicates = findDuplicateColumns(tables);
        showDuplicateColumns(duplicates);
    });

    function showTableDetails(table) {
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
                <p><strong>Chave Primária:</strong> ${table.primaryKey ? table.primaryKey.join(', ') : 'Nenhuma'}</p>
                <p><strong>Índices:</strong> ${table.indexes ? table.indexes.join(', ') : 'Nenhum'}</p>
                <p><strong>Chaves Estrangeiras:</strong> ${table.foreignKeys ? table.foreignKeys.join(', ') : 'Nenhuma'}</p>
                <p><strong>Restrições:</strong> ${table.constraints ? table.constraints.join(', ') : 'Nenhuma'}</p>
                <p><strong>Triggers:</strong> ${table.triggers ? table.triggers.join(', ') : 'Nenhuma'}</p>
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
            showEnvironmentDifferences(table.name, differences);
        });
    }

    function findDuplicateColumns(tables) {
        const columnTables = {};
        tables.forEach(table => {
            table.columns.forEach(col => {
                if (!columnTables[col.name.toUpperCase()]) {
                    columnTables[col.name.toUpperCase()] = [];
                }
                columnTables[col.name.toUpperCase()].push(table.name);
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
        const originColumns = originData[table.name.toUpperCase()]?.map(col => ({ ...col, name: col.name.toUpperCase() })) || [];
        const synapseColumns = table.columns.map(col => ({ ...col, name: col.name.toUpperCase() }));

        const differences = {
            missingInSynapse: [],
            extraInSynapse: [],
            mismatched: []
        };

        originColumns.forEach(originCol => {
            const synapseCol = synapseColumns.find(synapseCol => synapseCol.name === originCol.name);
            if (!synapseCol) {
                differences.missingInSynapse.push(originCol);
            } else if (
                synapseCol.type !== originCol.type ||
                synapseCol.size !== originCol.size ||
                synapseCol.default !== originCol.default ||
                synapseCol.constraints !== originCol.constraints
            ) {
                differences.mismatched.push({
                    origin: originCol,
                    synapse: synapseCol
                });
            }
        });

        synapseColumns.forEach(synapseCol => {
            if (!originColumns.some(originCol => originCol.name === synapseCol.name)) {
                differences.extraInSynapse.push(synapseCol);
            }
        });

        return differences;
    }

    function showEnvironmentDifferences(tableName, differences) {
        detailsDiv.innerHTML = `
            <div class="table-info">
                <h3>Diferenças entre Origem e Synapse para ${tableName}</h3>
                ${differences.missingInSynapse.length > 0 ? `
                <p><strong>Faltando no Synapse:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tipo de Dados</th>
                        <th>Tamanho/Precisão</th>
                        <th>Valor Padrão</th>
                        <th>Restrições</th>
                    </tr>
                    ${differences.missingInSynapse.map(col => `
                    <tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.size}</td>
                        <td>${col.default}</td>
                        <td>${col.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma coluna faltando no Synapse.</p>`}
                ${differences.extraInSynapse.length > 0 ? `
                <p><strong>Extra no Synapse:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Tipo de Dados</th>
                        <th>Tamanho/Precisão</th>
                        <th>Valor Padrão</th>
                        <th>Restrições</th>
                    </tr>
                    ${differences.extraInSynapse.map(col => `
                    <tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.size}</td>
                        <td>${col.default}</td>
                        <td>${col.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma coluna extra no Synapse.</p>`}
                ${differences.mismatched.length > 0 ? `
                <p><strong>Colunas com discrepâncias:</strong></p>
                <table>
                    <tr>
                        <th>Nome da Coluna</th>
                        <th>Origem</th>
                        <th>Synapse</th>
                    </tr>
                    ${differences.mismatched.map(diff => `
                    <tr>
                        <td>${diff.origin.name}</td>
                        <td>${diff.origin.type}${diff.origin.size ? `(${diff.origin.size})` : ''}, default: ${diff.origin.default}, constraints: ${diff.origin.constraints}</td>
                        <td>${diff.synapse.type}${diff.synapse.size ? `(${diff.synapse.size})` : ''}, default: ${diff.synapse.default}, constraints: ${diff.synapse.constraints}</td>
                    </tr>`).join('')}
                </table>
                ` : `<p>Nenhuma discrepância encontrada.</p>`}
            </div>
        `;
    }
});
