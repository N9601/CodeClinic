-- LabTrack LIMS: approve a QC result. Spec check, OOS flag and audit trail live here.
CREATE PROCEDURE dbo.usp_ApproveResult
    @SampleId     INT,
    @ResultValue  DECIMAL(18, 6),
    @ApprovedBy   NVARCHAR(128),
    @Reason       NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LowerLimit DECIMAL(18, 6), @UpperLimit DECIMAL(18, 6), @OldValue DECIMAL(18, 6);

    SELECT @LowerLimit = s.LowerLimit, @UpperLimit = s.UpperLimit
    FROM dbo.Specification s
    JOIN dbo.Sample sm ON sm.SpecificationId = s.SpecificationId
    WHERE sm.SampleId = @SampleId;

    SELECT @OldValue = ResultValue FROM dbo.Result WHERE SampleId = @SampleId;

    UPDATE dbo.Result
    SET ResultValue = @ResultValue,
        IsOutOfSpec = CASE WHEN @ResultValue < @LowerLimit OR @ResultValue > @UpperLimit THEN 1 ELSE 0 END,
        Status = 'APPROVED',
        ApprovedBy = @ApprovedBy,
        ApprovedOn = GETDATE()
    WHERE SampleId = @SampleId;

    -- Part 11 audit trail: who, what, when, why
    INSERT INTO dbo.AuditTrail (TableName, RecordId, FieldName, OldValue, NewValue, ChangedBy, ChangedOn, Reason)
    VALUES ('Result', @SampleId, 'ResultValue', @OldValue, @ResultValue, @ApprovedBy, GETDATE(), @Reason);
END
