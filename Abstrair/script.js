document.getElementById('process-files').addEventListener('click', async () => {
    const files = {
        tables: document.getElementById('tables-file').files[0],
        columns: document.getElementById('columns-file').files[0],
        primaryKeys: document.getElementById('primary-keys-file').files[0],
        indexes: document.getElementById('indexes-file').files[0],
        foreignKeys: document.getElementById('foreign-keys-file').files[0],
        constraints: document.getElementById('constraints-file').files[0],
        triggers: document.getElementById('triggers-file').files[0],
        recordCount: document.getElementById('record-count-file').files[0]
    };

    const data = {};
    for (const key in files) {
        if (files[key]) {
            data[key] = await readFile(files[key]);
        }
    }

    const tablesData = processTables(data);
    downloadJSON(tablesData, 'tables.json');
});

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result;
            const rows = text.split('\n').slice(1).filter(row => row.trim() !== ''); // Ignora a primeira linha (cabeçalho)
            resolve(rows.map(row => row.split(',').map(cell => cell.trim())));
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function processTables(data) {
    const tablesData = [];

    if (data.tables) {
        const tables = data.tables.map(row => ({ TableName: row[0], SchemaName: row[1] }));

        for (const table of tables) {
            const tableName = table.TableName;
            const tableInfo = {
                name: tableName,
                schema: table.SchemaName,
                columns: [],
                primaryKey: [],
                indexes: [],
                foreignKeys: [],
                constraints: [],
                triggers: [],
                recordCount: 0,  // Valor inicial
                performance: {
                    fragmentation: '10%',  // Valor de exemplo
                    tableSize: '500MB',    // Valor de exemplo
                    indexSize: '100MB'     // Valor de exemplo
                }
            };

            if (data.recordCount) {
                const record = data.recordCount.find(row => row[0] === tableName);
                if (record) {
                    tableInfo.recordCount = parseInt(record[2], 10);
                }
            }

            if (data.columns) {
                tableInfo.columns = data.columns
                    .filter(row => row[0] === tableName)
                    .map(row => ({
                        name: row[1],
                        type: row[2],
                        size: row[3],
                        default: row[6] || 'NULL',
                        constraints: row[4] == '0' ? 'NOT NULL' : ''
                    }));
            }

            if (data.primaryKeys) {
                tableInfo.primaryKey = data.primaryKeys
                    .filter(row => row[0] === tableName)
                    .map(row => row[1]);
            }

            if (data.indexes) {
                tableInfo.indexes = data.indexes
                    .filter(row => row[0] === tableName)
                    .map(row => row[1]);
            }

            if (data.foreignKeys) {
                tableInfo.foreignKeys = data.foreignKeys
                    .filter(row => row[0] === tableName)
                    .map(row => row[2]);
            }

            if (data.constraints) {
                tableInfo.constraints = data.constraints
                    .filter(row => row[0] === tableName)
                    .map(row => row[1]);
            }

            if (data.triggers) {
                tableInfo.triggers = data.triggers
                    .filter(row => row[0] === tableName)
                    .map(row => row[1]);
            }

            tablesData.push(tableInfo);
        }
    }

    return tablesData;
}

function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
