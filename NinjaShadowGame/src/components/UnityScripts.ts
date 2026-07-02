import { UnityScriptFile } from '../types/game';

export const UNITY_SCRIPTS: UnityScriptFile[] = [
  {
    name: "PlayerController.cs",
    category: "core",
    description: "Handles responsive player movement with acceleration, drag, animations, jumping, and blocking states.",
    code: `using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(Collider2D))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float baseMoveSpeed = 8f;
    [SerializeField] private float acceleration = 12f;
    [SerializeField] private float deceleration = 14f;
    [SerializeField] private float airControl = 0.75f;
    
    [Header("Jump Settings")]
    [SerializeField] private float jumpForce = 16f;
    [SerializeField] private Transform groundCheck;
    [SerializeField] private LayerMask groundLayer;
    [SerializeField] private float groundCheckRadius = 0.2f;

    // Component References
    private Rigidbody2D rb;
    private Animator animator;
    private HealthSystem healthSystem;
    private CombatSystem combatSystem;

    // State Variables
    private float horizontalInput;
    private float currentSpeed;
    private bool isGrounded;
    private bool isBlocking;
    private bool isFacingRight = true;
    private bool canMove = true;

    // Animation Hashes (Best practice for performance)
    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int VerticalVelocityHash = Animator.StringToHash("VerticalVelocity");
    private static readonly int IsBlockingHash = Animator.StringToHash("IsBlocking");
    private static readonly int JumpTriggerHash = Animator.StringToHash("Jump");

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        healthSystem = GetComponent<HealthSystem>();
        combatSystem = GetComponent<CombatSystem>();
    }

    private void Update()
    {
        if (!canMove || healthSystem.IsDead())
        {
            horizontalInput = 0;
            return;
        }

        // Fetch input from MobileInputHandler or Keyboard fallback
        horizontalInput = MobileInputHandler.Instance != null 
            ? MobileInputHandler.Instance.HorizontalJoystickInput 
            : Input.GetAxisRaw("Horizontal");

        // Jump Handling
        isGrounded = Physics2D.OverlapCircle(groundCheck.position, groundCheckRadius, groundLayer);
        
        bool requestJump = (Input.GetButtonDown("Jump") || (MobileInputHandler.Instance != null && MobileInputHandler.Instance.PopJumpRequest()));
        if (requestJump && isGrounded && !isBlocking)
        {
            Jump();
        }

        // Block Handling
        bool requestBlock = Input.GetKey(KeyCode.LeftShift) || (MobileInputHandler.Instance != null && MobileInputHandler.Instance.IsBlockingButtonDown);
        SetBlocking(requestBlock);

        // Animation Updates
        UpdateAnimations();
    }

    private void FixedUpdate()
    {
        if (!canMove || healthSystem.IsDead())
        {
            rb.velocity = new Vector2(0, rb.velocity.y);
            return;
        }

        // Apply movement forces with smoothing
        HandleMovement();
    }

    private void HandleMovement()
    {
        if (isBlocking)
        {
            // Reduce velocity to almost zero while blocking
            rb.velocity = new Vector2(Mathf.Lerp(rb.velocity.x, 0, Time.fixedDeltaTime * deceleration), rb.velocity.y);
            return;
        }

        // Adjust speed based on upgraded stats
        float targetSpeed = horizontalInput * GetUpgradedMoveSpeed();
        float currentAccel = isGrounded ? acceleration : (acceleration * airControl);
        
        // Calculate the difference and apply linear interpolation
        float speedDiff = targetSpeed - rb.velocity.x;
        float rate = Mathf.Abs(targetSpeed) > 0.01f ? currentAccel : deceleration;
        float newVelocityX = rb.velocity.x + (speedDiff * rate * Time.fixedDeltaTime);

        rb.velocity = new Vector2(newVelocityX, rb.velocity.y);

        // Turn character to face movement direction
        if (horizontalInput > 0.1f && !isFacingRight)
        {
            Flip();
        }
        else if (horizontalInput < -0.1f && isFacingRight)
        {
            Flip();
        }
    }

    private void Jump()
    {
        float upgradedJumpForce = baseMoveSpeed + (UpgradeSystem.Instance != null ? UpgradeSystem.Instance.GetStatMultiplier("JumpForce") * 2f : 0f);
        rb.velocity = new Vector2(rb.velocity.x, jumpForce);
        animator.SetTrigger(JumpTriggerHash);
    }

    private void SetBlocking(bool block)
    {
        isBlocking = block;
        healthSystem.SetBlockingState(block);
        animator.SetBool(IsBlockingHash, block);
    }

    private void Flip()
    {
        isFacingRight = !isFacingRight;
        Vector3 localScale = transform.localScale;
        localScale.x *= -1f;
        transform.localScale = localScale;
    }

    private void UpdateAnimations()
    {
        animator.SetFloat(SpeedHash, Mathf.Abs(rb.velocity.x));
        animator.SetBool(IsGroundedHash, isGrounded);
        animator.SetFloat(VerticalVelocityHash, rb.velocity.y);
    }

    private float GetUpgradedMoveSpeed()
    {
        if (UpgradeSystem.Instance != null)
        {
            return baseMoveSpeed + UpgradeSystem.Instance.GetStatMultiplier("MovementSpeed");
        }
        return baseMoveSpeed;
    }

    public void ToggleMovement(bool enable)
    {
        canMove = enable;
        if (!enable)
        {
            rb.velocity = Vector2.zero;
        }
    }

    public bool IsGrounded() => isGrounded;
    public bool IsFacingRight() => isFacingRight;
    public bool IsBlocking() => isBlocking;

    private void OnDrawGizmosSelected()
    {
        if (groundCheck != null)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawWireSphere(groundCheck.position, groundCheckRadius);
        }
    }
}`
  },
  {
    name: "CombatSystem.cs",
    category: "combat",
    description: "Implements light and heavy attacks, visual frame hit-boxes, combo input buffering, and timing validation.",
    code: `using UnityEngine;

public class CombatSystem : MonoBehaviour
{
    [Header("Combat Settings")]
    [SerializeField] private Transform attackPoint;
    [SerializeField] private float attackRange = 1.2f;
    [SerializeField] private LayerMask enemyLayers;
    
    [Header("Combo Variables")]
    [SerializeField] private float comboResetDelay = 0.8f;
    private int currentComboStep = 0;
    private float lastAttackTime = 0f;

    [Header("Input Buffer")]
    [SerializeField] private float inputBufferTime = 0.25f;
    private float lastInputTime = -1f;
    private AttackType bufferedAttack = AttackType.None;

    private PlayerController playerController;
    private Animator animator;

    private static readonly int LightAttackTrigger = Animator.StringToHash("LightAttack");
    private static readonly int HeavyAttackTrigger = Animator.StringToHash("HeavyAttack");
    private static readonly int ComboStepParam = Animator.StringToHash("ComboStep");

    public enum AttackType { None, Light, Heavy }

    private void Awake()
    {
        playerController = GetComponent<PlayerController>();
        animator = GetComponent<Animator>();
    }

    private void Update()
    {
        if (GetComponent<HealthSystem>().IsDead()) return;

        // Reset combo step if timing window expired
        if (Time.time - lastAttackTime > comboResetDelay)
        {
            currentComboStep = 0;
            animator.SetInteger(ComboStepParam, 0);
        }

        // Input buffering check
        if (Input.GetButtonDown("Fire1") || (MobileInputHandler.Instance != null && MobileInputHandler.Instance.PopLightAttackRequest()))
        {
            BufferAttack(AttackType.Light);
        }
        else if (Input.GetButtonDown("Fire2") || (MobileInputHandler.Instance != null && MobileInputHandler.Instance.PopHeavyAttackRequest()))
        {
            BufferAttack(AttackType.Heavy);
        }

        // Try executing buffered attacks
        if (bufferedAttack != AttackType.None && Time.time - lastInputTime <= inputBufferTime)
        {
            if (CanAttack())
            {
                ExecuteAttack(bufferedAttack);
                bufferedAttack = AttackType.None;
            }
        }
    }

    private void BufferAttack(AttackType type)
    {
        bufferedAttack = type;
        lastInputTime = Time.time;
    }

    private bool CanAttack()
    {
        // Don't allow attacking if airborne or blocking
        if (!playerController.IsGrounded() || playerController.IsBlocking())
            return false;

        // Ensure currently playing animation state permits combo chain
        AnimatorStateInfo stateInfo = animator.GetCurrentAnimatorStateInfo(0);
        return stateInfo.IsTag("Idle") || stateInfo.IsTag("Locomotion") || 
               (stateInfo.IsTag("Attack") && stateInfo.normalizedTime >= 0.55f);
    }

    private void ExecuteAttack(AttackType type)
    {
        lastAttackTime = Time.time;
        playerController.ToggleMovement(false); // Brief standstill during attack animations

        if (type == AttackType.Light)
        {
            currentComboStep = (currentComboStep % 3) + 1;
            animator.SetInteger(ComboStepParam, currentComboStep);
            animator.SetTrigger(LightAttackTrigger);
        }
        else if (type == AttackType.Heavy)
        {
            currentComboStep = 0;
            animator.SetInteger(ComboStepParam, 0);
            animator.SetTrigger(HeavyAttackTrigger);
            
            // Add a heavy forward lunge force
            Rigidbody2D rb = GetComponent<Rigidbody2D>();
            float lungeDirection = playerController.IsFacingRight() ? 1f : -1f;
            rb.velocity = new Vector2(lungeDirection * 10f, rb.velocity.y);
        }
    }

    // Animation Event Callback (Hooked up to the attack animation frames in Unity)
    public void OnAttackImpactFrame()
    {
        Collider2D[] hitEnemies = Physics2D.OverlapCircleAll(attackPoint.position, attackRange, enemyLayers);
        float damage = CalculateDamage();
        bool isHeavy = (currentComboStep == 0);

        foreach (Collider2D enemy in hitEnemies)
        {
            HealthSystem enemyHealth = enemy.GetComponent<HealthSystem>();
            if (enemyHealth != null)
            {
                // Knockback calculation
                Vector2 knockbackDir = (enemy.transform.position - transform.position).normalized;
                knockbackDir.y = 0.2f; // Slight lift
                float knockbackForce = isHeavy ? 12f : 5f;

                enemyHealth.TakeDamage(damage, knockbackForce, knockbackDir.normalized);

                // Polish effect: brief hit stop & screenshake
                if (EffectManager.Instance != null)
                {
                    EffectManager.Instance.TriggerHitStop(isHeavy ? 0.15f : 0.08f);
                    EffectManager.Instance.TriggerScreenShake(isHeavy ? 0.3f : 0.1f, isHeavy ? 0.25f : 0.12f);
                    EffectManager.Instance.SpawnHitSparks(enemy.transform.position, isHeavy);
                }
            }
        }
    }

    // Animation Event Callback (Allows moving again)
    public void OnAttackFinished()
    {
        playerController.ToggleMovement(true);
    }

    private float CalculateDamage()
    {
        float baseDamage = (currentComboStep == 0) ? 25f : 10f; // Heavy vs Light
        float upgradeBonus = UpgradeSystem.Instance != null ? UpgradeSystem.Instance.GetStatMultiplier("AttackDamage") : 0f;
        float multiplier = UpgradeSystem.Instance != null ? (1f + UpgradeSystem.Instance.GetStatMultiplier("ComboMultiplier")) : 1f;

        if (currentComboStep == 3) // Combo finisher
        {
            baseDamage *= 1.5f; // Finisher deals 50% more damage
        }

        return (baseDamage + upgradeBonus) * multiplier;
    }

    private void OnDrawGizmosSelected()
    {
        if (attackPoint != null)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(attackPoint.position, attackRange);
        }
    }
}`
  },
  {
    name: "EnemyAI.cs",
    category: "ai",
    description: "Finite State Machine with human-like reaction times, patrolling, chasing, attacking, and backing away.",
    code: `using UnityEngine;
using System.Collections;

[RequireComponent(typeof(Rigidbody2D))]
[RequireComponent(typeof(HealthSystem))]
public class EnemyAI : MonoBehaviour
{
    public enum EnemyState { Idle, Patrol, Chase, Attack, Stagger, Retreat }

    [Header("AI State Settings")]
    [SerializeField] private EnemyState currentState = EnemyState.Patrol;
    [SerializeField] private float detectionRange = 6f;
    [SerializeField] private float attackRange = 1.3f;
    [SerializeField] private float retreatRange = 2f;
    [SerializeField] private float actionDelay = 0.25f; // Human-like reaction time

    [Header("Patrol Settings")]
    [SerializeField] private Transform[] patrolPoints;
    [SerializeField] private float patrolSpeed = 3f;
    [SerializeField] private float chaseSpeed = 5f;
    
    [Header("Attack Parameters")]
    [SerializeField] private float attackCooldown = 1.5f;
    [SerializeField] private Transform attackPoint;
    [SerializeField] private float hitBoxRadius = 0.9f;
    [SerializeField] private float attackDamage = 12f;

    private Transform player;
    private Rigidbody2D rb;
    private Animator animator;
    private HealthSystem healthSystem;

    private int currentPatrolIndex = 0;
    private float lastAttackTime = 0f;
    private bool isFacingRight = true;
    private bool isDecisionActive = false;
    private bool isStaggered = false;

    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int AttackTriggerHash = Animator.StringToHash("Attack");
    private static readonly int StaggerTriggerHash = Animator.StringToHash("Stagger");

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        healthSystem = GetComponent<HealthSystem>();
    }

    private void Start()
    {
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null) player = playerObj.transform;
    }

    private void Update()
    {
        if (healthSystem.IsDead() || isStaggered) return;

        // Smooth state evaluation using reaction delays
        if (!isDecisionActive)
        {
            StartCoroutine(EvaluateBehaviorWithReactionDelay());
        }

        UpdateAnimator();
    }

    private IEnumerator EvaluateBehaviorWithReactionDelay()
    {
        isDecisionActive = true;
        yield return new WaitForSeconds(actionDelay);

        if (player != null && !player.GetComponent<HealthSystem>().IsDead())
        {
            float distanceToPlayer = Vector2.Distance(transform.position, player.position);

            if (distanceToPlayer <= attackRange)
            {
                currentState = EnemyState.Attack;
            }
            else if (distanceToPlayer <= detectionRange)
            {
                // If low health, intelligent AI occasionally retreats
                if (healthSystem.GetHealthPercentage() < 0.25f && distanceToPlayer <= retreatRange)
                {
                    currentState = EnemyState.Retreat;
                }
                else
                {
                    currentState = EnemyState.Chase;
                }
            }
            else
            {
                currentState = EnemyState.Patrol;
            }
        }
        else
        {
            currentState = EnemyState.Patrol;
        }

        ExecuteStateBehavior();
        isDecisionActive = false;
    }

    private void ExecuteStateBehavior()
    {
        switch (currentState)
        {
            case EnemyState.Idle:
                rb.velocity = new Vector2(0, rb.velocity.y);
                break;

            case EnemyState.Patrol:
                PatrolBehavior();
                break;

            case EnemyState.Chase:
                ChaseBehavior();
                break;

            case EnemyState.Attack:
                AttackBehavior();
                break;

            case EnemyState.Retreat:
                RetreatBehavior();
                break;
        }
    }

    private void PatrolBehavior()
    {
        if (patrolPoints == null || patrolPoints.Length == 0) return;

        Transform targetPoint = patrolPoints[currentPatrolIndex];
        float direction = Mathf.Sign(targetPoint.position.x - transform.position.x);
        rb.velocity = new Vector2(direction * patrolSpeed, rb.velocity.y);

        if (Vector2.Distance(transform.position, targetPoint.position) < 0.5f)
        {
            currentPatrolIndex = (currentPatrolIndex + 1) % patrolPoints.Length;
        }

        FaceDirection(rb.velocity.x);
    }

    private void ChaseBehavior()
    {
        if (player == null) return;
        float direction = Mathf.Sign(player.position.x - transform.position.x);
        rb.velocity = new Vector2(direction * chaseSpeed, rb.velocity.y);

        FaceDirection(rb.velocity.x);
    }

    private void AttackBehavior()
    {
        rb.velocity = new Vector2(0, rb.velocity.y); // Stop movement while swinging
        
        if (player != null)
        {
            FaceDirection(player.position.x - transform.position.x);
        }

        if (Time.time - lastAttackTime >= attackCooldown)
        {
            lastAttackTime = Time.time;
            animator.SetTrigger(AttackTriggerHash);
        }
    }

    private void RetreatBehavior()
    {
        if (player == null) return;
        float direction = Mathf.Sign(transform.position.x - player.position.x); // Run opposite to player
        rb.velocity = new Vector2(direction * chaseSpeed * 0.8f, rb.velocity.y);

        FaceDirection(-direction); // Face player while backing away
    }

    // Called from Animation Event during attack frames
    public void OnEnemyAttackImpactFrame()
    {
        Collider2D hitPlayer = Physics2D.OverlapCircle(attackPoint.position, hitBoxRadius, LayerMask.GetMask("Player"));
        if (hitPlayer != null)
        {
            HealthSystem playerHealth = hitPlayer.GetComponent<HealthSystem>();
            if (playerHealth != null)
            {
                Vector2 knockbackDir = (hitPlayer.transform.position - transform.position).normalized;
                knockbackDir.y = 0.15f;
                playerHealth.TakeDamage(attackDamage, 7f, knockbackDir);
            }
        }
    }

    public void TriggerStagger(float duration)
    {
        StartCoroutine(StaggerRoutine(duration));
    }

    private IEnumerator StaggerRoutine(float duration)
    {
        isStaggered = true;
        currentState = EnemyState.Stagger;
        rb.velocity = Vector2.zero;
        animator.SetTrigger(StaggerTriggerHash);

        yield return new WaitForSeconds(duration);

        isStaggered = false;
    }

    private void FaceDirection(float directionX)
    {
        if (directionX > 0.05f && !isFacingRight)
        {
            Flip();
        }
        else if (directionX < -0.05f && isFacingRight)
        {
            Flip();
        }
    }

    private void Flip()
    {
        isFacingRight = !isFacingRight;
        Vector3 localScale = transform.localScale;
        localScale.x *= -1f;
        transform.localScale = localScale;
    }

    private void UpdateAnimator()
    {
        animator.SetFloat(SpeedHash, Mathf.Abs(rb.velocity.x));
    }

    private void OnDrawGizmosSelected()
    {
        if (attackPoint != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(attackPoint.position, hitBoxRadius);
        }
    }
}`
  },
  {
    name: "BossAI.cs",
    category: "ai",
    description: "Multi-phase boss combat with flaming armor state, custom area attacks, and health threshold transitions.",
    code: `using UnityEngine;
using System.Collections;

public class BossAI : MonoBehaviour
{
    public enum BossPhase { Phase1, Phase2 }

    [Header("Phase Settings")]
    [SerializeField] private BossPhase currentPhase = BossPhase.Phase1;
    [SerializeField] private float phaseTransitionPercent = 0.4f; // Triggers at 40% health
    [SerializeField] private GameObject fireParticlesAura;

    [Header("Boss Statistics")]
    [SerializeField] private float phase1Speed = 4f;
    [SerializeField] private float phase2Speed = 6.5f;
    [SerializeField] private float phase1Damage = 18f;
    [SerializeField] private float phase2Damage = 28f;

    [Header("Special Abilities")]
    [SerializeField] private Transform groundWavePoint;
    [SerializeField] private GameObject groundWavePrefab;
    [SerializeField] private float specialAbilityCooldown = 8f;

    private Transform player;
    private Rigidbody2D rb;
    private Animator animator;
    private HealthSystem healthSystem;
    private float lastAttackTime = 0f;
    private float lastSpecialTime = 0f;
    private bool isFacingRight = true;
    private bool isTransitioning = false;

    private static readonly int AttackTrigger = Animator.StringToHash("BossAttack");
    private static readonly int SpecialTrigger = Animator.StringToHash("BossSpecial");
    private static readonly int StaggerTrigger = Animator.StringToHash("Stagger");
    private static readonly int IsEnraged = Animator.StringToHash("Enraged");

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
        healthSystem = GetComponent<HealthSystem>();
    }

    private void Start()
    {
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null) player = playerObj.transform;

        if (fireParticlesAura != null) fireParticlesAura.SetActive(false);
    }

    private void Update()
    {
        if (healthSystem.IsDead() || isTransitioning) return;

        // Check if we need to transition to Phase 2
        if (currentPhase == BossPhase.Phase1 && healthSystem.GetHealthPercentage() <= phaseTransitionPercent)
        {
            StartCoroutine(TransitionToPhase2Routine());
            return;
        }

        EvaluateCombatAndMovement();
    }

    private void EvaluateCombatAndMovement()
    {
        if (player == null || player.GetComponent<HealthSystem>().IsDead()) return;

        float distance = Vector2.Distance(transform.position, player.position);
        float currentSpeed = (currentPhase == BossPhase.Phase1) ? phase1Speed : phase2Speed;

        // Face player
        float direction = Mathf.Sign(player.position.x - transform.position.x);
        if ((direction > 0 && !isFacingRight) || (direction < 0 && isFacingRight))
        {
            Flip();
        }

        if (distance <= 1.5f)
        {
            rb.velocity = new Vector2(0, rb.velocity.y);
            TriggerBasicAttack();
        }
        else if (distance <= 7f)
        {
            // Walk closer
            rb.velocity = new Vector2(direction * currentSpeed, rb.velocity.y);
            
            // Periodically cast Special shockwave attack in Phase 2
            if (currentPhase == BossPhase.Phase2 && Time.time - lastSpecialTime > specialAbilityCooldown)
            {
                TriggerSpecialShockwave();
            }
        }
        else
        {
            // Lunge / leap forward
            rb.velocity = new Vector2(direction * currentSpeed * 1.3f, rb.velocity.y);
        }
    }

    private void TriggerBasicAttack()
    {
        float cooldown = (currentPhase == BossPhase.Phase1) ? 2f : 1f;
        if (Time.time - lastAttackTime > cooldown)
        {
            lastAttackTime = Time.time;
            animator.SetTrigger(AttackTrigger);
        }
    }

    private void TriggerSpecialShockwave()
    {
        lastSpecialTime = Time.time;
        rb.velocity = Vector2.zero;
        animator.SetTrigger(SpecialTrigger);
    }

    // Called via Animator Special event
    public void OnBossSpecialImpactFrame()
    {
        if (groundWavePrefab != null && groundWavePoint != null)
        {
            GameObject wave = Instantiate(groundWavePrefab, groundWavePoint.position, Quaternion.identity);
            Rigidbody2D waveRb = wave.GetComponent<Rigidbody2D>();
            if (waveRb != null)
            {
                float forceDirection = isFacingRight ? 1f : -1f;
                waveRb.velocity = new Vector2(forceDirection * 12f, 0f);
            }
        }
    }

    // Called via Animator Basic attack event
    public void OnBossAttackImpactFrame()
    {
        float damage = (currentPhase == BossPhase.Phase1) ? phase1Damage : phase2Damage;
        Collider2D hitPlayer = Physics2D.OverlapCircle(transform.position + (isFacingRight ? Vector3.right : Vector3.left), 1.6f, LayerMask.GetMask("Player"));
        
        if (hitPlayer != null)
        {
            HealthSystem playerHealth = hitPlayer.GetComponent<HealthSystem>();
            if (playerHealth != null)
            {
                Vector2 knockback = new Vector2(isFacingRight ? 1f : -1f, 0.2f);
                playerHealth.TakeDamage(damage, 15f, knockback);
            }
        }
    }

    private IEnumerator TransitionToPhase2Routine()
    {
        isTransitioning = true;
        rb.velocity = Vector2.zero;
        currentPhase = BossPhase.Phase2;

        animator.SetTrigger(StaggerTrigger);
        animator.SetBool(IsEnraged, true);

        // Slow motion & Screen shake zoom during transition
        if (EffectManager.Instance != null)
        {
            EffectManager.Instance.TriggerHitStop(0.8f);
            EffectManager.Instance.TriggerScreenShake(0.8f, 1f);
        }

        yield return new WaitForSeconds(1.5f);

        if (fireParticlesAura != null)
        {
            fireParticlesAura.SetActive(true);
        }

        isTransitioning = false;
    }

    private void Flip()
    {
        isFacingRight = !isFacingRight;
        Vector3 scale = transform.localScale;
        scale.x *= -1f;
        transform.localScale = scale;
    }
}`
  },
  {
    name: "HealthSystem.cs",
    category: "core",
    description: "Handles health bounds, shield/blocking damage mitigation, stagger animations, and death states.",
    code: `using UnityEngine;
using UnityEngine.Events;

public class HealthSystem : MonoBehaviour
{
    [Header("Health Settings")]
    [SerializeField] private float baseMaxHealth = 100f;
    private float currentHealth;
    private bool isBlocking = false;
    private bool isInvincible = false;
    private bool isDead = false;

    [Header("Invincibility settings")]
    [SerializeField] private float iFrameDuration = 0.2f;

    [Header("Events")]
    public UnityEvent OnDamageTaken;
    public UnityEvent OnDeath;

    private Rigidbody2D rb;
    private Animator animator;

    private static readonly int DeathTrigger = Animator.StringToHash("Death");
    private static readonly int HitStunTrigger = Animator.StringToHash("HitStun");

    private void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        animator = GetComponent<Animator>();
    }

    private void Start()
    {
        ResetHealth();
    }

    public void ResetHealth()
    {
        float actualMax = baseMaxHealth;
        if (CompareTag("Player") && UpgradeSystem.Instance != null)
        {
            actualMax += UpgradeSystem.Instance.GetStatMultiplier("MaxHealth");
        }
        currentHealth = actualMax;
        isDead = false;
    }

    public void SetBlockingState(bool block)
    {
        isBlocking = block;
    }

    public void TakeDamage(float damageAmount, float knockbackForce, Vector2 knockbackDirection)
    {
        if (isDead || isInvincible) return;

        // Blocking reduces damage by 80% and negates knockback completely
        if (isBlocking)
        {
            damageAmount *= 0.2f;
            knockbackForce = 0f;
            // Spawn spark block FX
            if (EffectManager.Instance != null)
            {
                EffectManager.Instance.SpawnBlockSparks(transform.position);
            }
        }

        currentHealth -= damageAmount;
        currentHealth = Mathf.Clamp(currentHealth, 0f, GetMaxHealth());

        OnDamageTaken?.Invoke();

        // Apply knockback
        if (knockbackForce > 0f && rb != null)
        {
            rb.velocity = Vector2.zero; // cancel old movement forces
            rb.AddForce(knockbackDirection * knockbackForce, ForceMode2D.Impulse);
        }

        // Stagger behavior
        if (currentHealth > 0f)
        {
            if (!isBlocking)
            {
                animator.SetTrigger(HitStunTrigger);
                EnemyAI enemyAI = GetComponent<EnemyAI>();
                if (enemyAI != null) enemyAI.TriggerStagger(0.4f);
            }
            StartCoroutine(IFrameRoutine());
        }
        else
        {
            Die();
        }
    }

    private System.Collections.IEnumerator IFrameRoutine()
    {
        isInvincible = true;
        yield return new WaitForSeconds(iFrameDuration);
        isInvincible = false;
    }

    private void Die()
    {
        isDead = true;
        animator.SetTrigger(DeathTrigger);
        rb.velocity = Vector2.zero;
        
        // Disable physics interactions
        GetComponent<Collider2D>().enabled = false;
        rb.isKinematic = true;

        OnDeath?.Invoke();

        // Notify GameManager of kills/defeats
        if (GameManager.Instance != null)
        {
            if (CompareTag("Player"))
            {
                GameManager.Instance.OnPlayerDefeated();
            }
            else if (name.Contains("Boss"))
            {
                GameManager.Instance.OnBossDefeated();
            }
            else
            {
                GameManager.Instance.OnEnemyDefeated();
            }
        }
    }

    public float GetMaxHealth()
    {
        if (CompareTag("Player") && UpgradeSystem.Instance != null)
        {
            return baseMaxHealth + UpgradeSystem.Instance.GetStatMultiplier("MaxHealth");
        }
        return baseMaxHealth;
    }

    public float GetCurrentHealth() => currentHealth;
    public float GetHealthPercentage() => currentHealth / GetMaxHealth();
    public bool IsDead() => isDead;
}`
  },
  {
    name: "GameManager.cs",
    category: "core",
    description: "Main game loop coordinator, score tracking, restarts, and game state transitions.",
    code: `using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public enum GameState { StartMenu, Playing, UpgradeMenu, Victory, Defeat }

    [Header("Game State")]
    [SerializeField] private GameState currentState = GameState.StartMenu;
    [SerializeField] private int pointsEarned = 0;
    [SerializeField] private int enemiesDefeatedCount = 0;

    [Header("Spawn Settings")]
    [SerializeField] private Transform playerSpawnPoint;
    [SerializeField] private GameObject playerPrefab;

    private GameObject activePlayer;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        TransitionToState(GameState.StartMenu);
    }

    public void TransitionToState(GameState newState)
    {
        currentState = newState;
        
        switch (currentState)
        {
            case GameState.StartMenu:
                Time.timeScale = 1f;
                break;
                
            case GameState.Playing:
                Time.timeScale = 1f;
                SpawnPlayerIfNeeded();
                break;

            case GameState.UpgradeMenu:
                Time.timeScale = 0f; // Pause combat during upgrades
                break;

            case GameState.Victory:
                Time.timeScale = 0.5f; // Cool slow motion victory
                break;

            case GameState.Defeat:
                Time.timeScale = 0.5f;
                break;
        }

        // Notify UI Canvas to swap appropriate panels
        if (UI_Controller.Instance != null)
        {
            UI_Controller.Instance.OnGameStateChanged(currentState);
        }
    }

    private void SpawnPlayerIfNeeded()
    {
        if (activePlayer == null)
        {
            activePlayer = Instantiate(playerPrefab, playerSpawnPoint.position, Quaternion.identity);
        }
        else
        {
            activePlayer.transform.position = playerSpawnPoint.position;
            activePlayer.GetComponent<HealthSystem>().ResetHealth();
            activePlayer.GetComponent<Collider2D>().enabled = true;
            activePlayer.GetComponent<Rigidbody2D>().isKinematic = false;
        }
    }

    public void OnEnemyDefeated()
    {
        enemiesDefeatedCount++;
        AddPoints(10); // Standard enemy rewards
    }

    public void OnBossDefeated()
    {
        AddPoints(100); // Massive boss rewards
        TransitionToState(GameState.Victory);
    }

    public void OnPlayerDefeated()
    {
        TransitionToState(GameState.Defeat);
    }

    public void AddPoints(int amount)
    {
        pointsEarned += amount;
        // Persist session coins into UpgradeSystem
        if (UpgradeSystem.Instance != null)
        {
            UpgradeSystem.Instance.AddCoins(amount);
        }
    }

    public void RestartGame()
    {
        pointsEarned = 0;
        enemiesDefeatedCount = 0;
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        TransitionToState(GameState.Playing);
    }

    public int GetPoints() => pointsEarned;
    public int GetEnemiesDefeatedCount() => enemiesDefeatedCount;
    public GameState GetCurrentState() => currentState;
}`
  },
  {
    name: "MobileInputHandler.cs",
    category: "utility",
    description: "Connects virtual joystick and on-screen tactile buttons to controller callback logic.",
    code: `using UnityEngine;

public class MobileInputHandler : MonoBehaviour
{
    public static MobileInputHandler Instance { get; private set; }

    [Header("Virtual Controls Status")]
    public float HorizontalJoystickInput { get; private set; }
    public bool IsBlockingButtonDown { get; private set; }

    private bool jumpRequested = false;
    private bool lightAttackRequested = false;
    private bool heavyAttackRequested = false;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    // Called by on-screen custom drag UI scripts (Virtual Joystick)
    public void UpdateJoystickInput(float value)
    {
        HorizontalJoystickInput = Mathf.Clamp(value, -1f, 1f);
    }

    // Called by UI Button event triggers (Jump)
    public void OnJumpPressed()
    {
        jumpRequested = true;
    }

    // Called by UI Button event triggers (Light Attack)
    public void OnLightAttackPressed()
    {
        lightAttackRequested = true;
    }

    // Called by UI Button event triggers (Heavy Attack)
    public void OnHeavyAttackPressed()
    {
        heavyAttackRequested = true;
    }

    // Called by UI Button pointer-down / pointer-up events (Blocking Shield)
    public void OnBlockButtonState(bool isDown)
    {
        IsBlockingButtonDown = isDown;
    }

    // Readers with immediate flag reset (Buffer cleaners)
    public bool PopJumpRequest()
    {
        bool r = jumpRequested;
        jumpRequested = false;
        return r;
    }

    public bool PopLightAttackRequest()
    {
        bool r = lightAttackRequested;
        lightAttackRequested = false;
        return r;
    }

    public bool PopHeavyAttackRequest()
    {
        bool r = heavyAttackRequested;
        heavyAttackRequested = false;
        return r;
    }
}`
  },
  {
    name: "UpgradeSystem.cs",
    category: "core",
    description: "Saves and loads upgrade values from Unity PlayerPrefs, modifying base game stats dynamically.",
    code: `using UnityEngine;
using System.Collections.Generic;

public class UpgradeSystem : MonoBehaviour
{
    public static UpgradeSystem Instance { get; private set; }

    [Header("Currency Settings")]
    [SerializeField] private string coinSaveKey = "PlayerCoins";
    private int currentCoins = 100; // base starting points

    // Stats scaling configuration mapping
    private Dictionary<string, int> upgradeLevels = new Dictionary<string, int>();

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadUpgrades();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void LoadUpgrades()
    {
        currentCoins = PlayerPrefs.GetInt(coinSaveKey, 100);
        
        // Load default/previous upgrade levels
        upgradeLevels["MaxHealth"] = PlayerPrefs.GetInt("Upgrade_MaxHealth", 0);
        upgradeLevels["MovementSpeed"] = PlayerPrefs.GetInt("Upgrade_MovementSpeed", 0);
        upgradeLevels["AttackDamage"] = PlayerPrefs.GetInt("Upgrade_AttackDamage", 0);
        upgradeLevels["ComboMultiplier"] = PlayerPrefs.GetInt("Upgrade_ComboMultiplier", 0);
    }

    public bool PurchaseUpgrade(string statName, int cost)
    {
        if (currentCoins >= cost)
        {
            currentCoins -= cost;
            upgradeLevels[statName] = upgradeLevels.GetValueOrDefault(statName, 0) + 1;
            
            // Save immediately (best practice for mobile)
            PlayerPrefs.SetInt(coinSaveKey, currentCoins);
            PlayerPrefs.SetInt("Upgrade_" + statName, upgradeLevels[statName]);
            PlayerPrefs.Save();
            
            // Apply new stats instantly to active player
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                player.GetComponent<HealthSystem>().ResetHealth();
            }
            return true;
        }
        return false;
    }

    public float GetStatMultiplier(string statName)
    {
        int level = upgradeLevels.GetValueOrDefault(statName, 0);
        switch (statName)
        {
            case "MaxHealth":
                return level * 15f; // +15 HP per level
            case "MovementSpeed":
                return level * 0.8f; // +0.8m/s speed per level
            case "AttackDamage":
                return level * 4f; // +4 damage per level
            case "ComboMultiplier":
                return level * 0.1f; // +10% damage multiplier per level
            default:
                return 0f;
        }
    }

    public void AddCoins(int amount)
    {
        currentCoins += amount;
        PlayerPrefs.SetInt(coinSaveKey, currentCoins);
        PlayerPrefs.Save();
    }

    public int GetCoins() => currentCoins;
    public int GetUpgradeLevel(string statName) => upgradeLevels.GetValueOrDefault(statName, 0);
}`
  },
  {
    name: "CameraFollow.cs",
    category: "utility",
    description: "Responsive camera tracking, clamp ranges, and integrated horizontal/vertical screen shake API.",
    code: `using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    public static CameraFollow Instance { get; private set; }

    [Header("Tracking Parameters")]
    [SerializeField] private Transform target;
    [SerializeField] private float smoothTime = 0.25f;
    [SerializeField] private Vector3 offset = new Vector3(0, 1.5f, -10f);

    [Header("Level Boundaries")]
    [SerializeField] private Vector2 minBounds = new Vector2(-20f, -2f);
    [SerializeField] private Vector2 maxBounds = new Vector2(50f, 10f);

    private Vector3 currentVelocity;
    private float shakeTimeLeft = 0f;
    private float shakeMagnitude = 0f;
    private Vector3 originalPos;

    private void Awake()
    {
        if (Instance == null) Instance = this;
    }

    private void Start()
    {
        if (target == null)
        {
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null) target = player.transform;
        }
    }

    private void LateUpdate()
    {
        if (target == null) return;

        // Smooth translation
        Vector3 targetPos = target.position + offset;
        Vector3 smoothedPos = Vector3.SmoothDamp(transform.position, targetPos, ref currentVelocity, smoothTime);

        // Enforce boundary clamps
        float clampedX = Mathf.Clamp(smoothedPos.x, minBounds.x, maxBounds.x);
        float clampedY = Mathf.Clamp(smoothedPos.y, minBounds.y, maxBounds.y);
        
        Vector3 nextPos = new Vector3(clampedX, clampedY, offset.z);

        // Apply visual screen shaking
        if (shakeTimeLeft > 0)
        {
            Vector2 shakeOffset = Random.insideUnitCircle * shakeMagnitude;
            nextPos += new Vector3(shakeOffset.x, shakeOffset.y, 0f);
            shakeTimeLeft -= Time.deltaTime;
        }

        transform.position = nextPos;
    }

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }

    public void TriggerShake(float duration, float magnitude)
    {
        shakeTimeLeft = duration;
        shakeMagnitude = magnitude;
    }
}`
  },
  {
    name: "EffectManager.cs",
    category: "utility",
    description: "Orchestrates micro-interactions, freezes frame rates for hit impacts, and spawns modular feedback.",
    code: `using UnityEngine;
using System.Collections;

public class EffectManager : MonoBehaviour
{
    public static EffectManager Instance { get; private set; }

    [Header("Particle System Prefabs")]
    [SerializeField] private GameObject hitSparksNormalPrefab;
    [SerializeField] private GameObject hitSparksHeavyPrefab;
    [SerializeField] private GameObject blockSparksPrefab;

    private bool isHitStopActive = false;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void TriggerHitStop(float duration)
    {
        if (isHitStopActive) return;
        StartCoroutine(HitStopRoutine(duration));
    }

    private IEnumerator HitStopRoutine(float duration)
    {
        isHitStopActive = true;
        Time.timeScale = 0.05f; // Freeze frame rate (not zero to keep calculations active)
        
        yield return new WaitForSecondsRealtime(duration); // Yield in realtime seconds
        
        // Restore time scale (or respect Victory/Defeat speed overrides)
        if (GameManager.Instance != null && 
            (GameManager.Instance.GetCurrentState() == GameManager.GameState.Victory || 
             GameManager.Instance.GetCurrentState() == GameManager.GameState.Defeat))
        {
            Time.timeScale = 0.5f;
        }
        else
        {
            Time.timeScale = 1f;
        }
        isHitStopActive = false;
    }

    public void TriggerScreenShake(float duration, float magnitude)
    {
        if (CameraFollow.Instance != null)
        {
            CameraFollow.Instance.TriggerShake(duration, magnitude);
        }
    }

    public void SpawnHitSparks(Vector3 position, bool isHeavy)
    {
        GameObject prefab = isHeavy ? hitSparksHeavyPrefab : hitSparksNormalPrefab;
        if (prefab != null)
        {
            GameObject spark = Instantiate(prefab, position, Quaternion.identity);
            Destroy(spark, 1f); // Auto clean-up
        }
    }

    public void SpawnBlockSparks(Vector3 position)
    {
        if (blockSparksPrefab != null)
        {
            GameObject spark = Instantiate(blockSparksPrefab, position, Quaternion.identity);
            Destroy(spark, 0.8f);
        }
    }
}`
  }
];
