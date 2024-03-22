const stageControl = {
    isCreated: ['1'],
    isRemoved: ['1'],
    isAdd: ['1'],
    isSend: ['1','2','3','4','5'],
    isReject: ['3','4','5'],
    updatefield: [
        {stage: '1', field_name: 'requester'},
        {stage: '2', field_name: 'branch_concur'},
        {stage: '3', field_name: 'legal_concur'},
        {stage: '4', field_name: 'finance_concur'},
        {stage: '5', field_name: 'ceo_concur'}
    ]
}

module.exports.stageControl = stageControl;